// No browser package needed: use Chrome's built-in debugging protocol and Node WebSocket.
// Start Vite first. CHROME_PATH may override the standard Windows Chrome location.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const executable = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const directory = await mkdtemp(path.join(os.tmpdir(),'salon-browser-'));
const debugPort = 10000 + Math.floor(Math.random()*20000);
const browser = spawn(executable,['--headless=new','--no-first-run','--disable-gpu',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${directory}`,'about:blank'],{stdio:'ignore',windowsHide:true});
const keepAlive = setInterval(()=>{},1000);
let socket; const pending = new Map(); let next = 0;
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));

const send = (method,params={}) => new Promise((resolve,reject)=>{ const id=++next; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Browser command timed out: ${method}`));},10000); pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params})); });
async function evaluate(expression) { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
try {
  let pages;
  for(let i=0;i<40;i++){try{pages=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json();break;}catch{await pause(250);}}
  assert.ok(pages?.length,'Chrome debugging could not start.');
  const page = pages.find(item => item.type === 'page' && !item.url.startsWith('chrome-extension:'));
  assert.ok(page,'No browser page target found.');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);}});
  await send('Page.enable'); await send('Runtime.enable');
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')console.error('Browser exception:',message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);});

  const environment = Object.fromEntries((await readFile('../backend/.env','utf8')).split(/\r?\n/).filter(line=>/^(PORT|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD)=/.test(line)).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).trim()];}));
  const base = 'http://localhost:' + environment.PORT + '/api';
  const login = await fetch(base+'/auth/login',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({email:environment.SEED_ADMIN_EMAIL,password:environment.SEED_ADMIN_PASSWORD})});
  assert.equal(login.status,200,'Admin login must succeed');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const split = cookie.indexOf('=');
  await send('Network.enable');
  await send('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:'http://localhost:5173',httpOnly:true,sameSite:'Lax'});

  const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate('Boolean('+expression+')'))return;await pause(100);}throw new Error('Navigation check timed out');};
  for(const width of [360,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
    await send('Page.navigate',{url:'http://localhost:5173/admin/appointments'});
    await waitFor('document.querySelector("tbody tr") && !document.getElementById("site-preloader")');
    for(let repeat=0;repeat<2;repeat++){
      await evaluate('window.scrollTo({top:document.body.scrollHeight,left:0,behavior:"instant"})');await pause(100);
      assert.ok(await evaluate('window.scrollY>0'),'Admin page must start scrolled for regression');
      if(width===360){await evaluate('document.querySelector(".panel-menu").click()');await pause(100);}
      await evaluate('document.querySelector(".visit-website").click()');
      await waitFor('location.pathname==="/" && document.querySelector(".hero h1")');await pause(900);
      assert.equal(await evaluate('window.scrollY'),0,'Visit Website must open Home at top');
      assert.equal(await evaluate(`document.querySelectorAll('a[href^="/user/book"]').length`),0);
      assert.equal(await evaluate('[...document.querySelectorAll("[data-reveal]")].filter(el=>getComputedStyle(el).opacity==="0").length'),0,'Sections must never stay invisible');
      await evaluate('document.querySelector(".split[data-reveal]").scrollIntoView({block:"center",behavior:"instant"})');await pause(900);
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".split[data-reveal]")).opacity'),'1');
      await evaluate(`document.querySelector('.nav-links a[href="/admin"]').click()`);
      await waitFor('location.pathname==="/admin" && document.querySelector(".sidebar") && document.querySelector("h1")');
      // Use the longer appointments page again without reloading the app.
      await evaluate(`document.querySelector('.sidebar nav a[href="/admin/appointments"]').click()`);
      await waitFor('location.pathname==="/admin/appointments" && document.querySelector("tbody tr")');
    }
  }
  await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'http://localhost:5173'}});
  console.log('PASS: Visit Website from scrolled admin pages opens Home at top; sections stay visible on repeated mobile/desktop navigation; admin booking remains hidden.');
} catch(error){console.error(error.message);process.exitCode=1;}
finally{if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});clearInterval(keepAlive);socket?.close();browser.kill();}
