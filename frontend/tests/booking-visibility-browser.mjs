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

  const waitFor = async expression => {for(let i=0;i<100;i++){if(await evaluate('Boolean('+expression+')'))return;await pause(100);}throw new Error('Page did not finish loading');};
  const firstService=(await (await fetch(base+'/public/services?limit=1')).json()).data.items[0];
  const routes=['/','/services','/offers','/contact','/services/'+firstService._id];
  let checks=0;
  for(const width of [360,1280]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
    for(const route of routes){
      await send('Page.navigate',{url:'http://localhost:5173'+route});
      await waitFor(`document.querySelector('.nav-links a[href="/admin"]') && document.querySelector('h1') && !document.querySelector('.loader-wrap')`);
      assert.equal(await evaluate(`document.querySelectorAll('a[href^="/user/book"]').length`),0,'Admin must not see booking links: '+route);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'));checks++;
    }
  }
  await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'http://localhost:5173'}});
  await send('Network.deleteCookies',{name:cookie.slice(0,split),domain:'localhost'});
  await send('Page.navigate',{url:'http://localhost:5173/'});
  await waitFor(`document.querySelector('.nav-links a[href="/login"]') && document.querySelector('a[href^="/user/book"]')`);checks++;
  const registered=await fetch(base+'/auth/register',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({name:'Booking visibility QA',email:'booking-qa-'+Date.now()+'@example.com',phone:'9000099999',password:'Visibility123',gender:'Other'})});
  assert.equal(registered.status,201);const userCookie=registered.headers.get('set-cookie').split(';')[0];const separator=userCookie.indexOf('=');
  try {
    await send('Network.setCookie',{name:userCookie.slice(0,separator),value:userCookie.slice(separator+1),url:'http://localhost:5173',httpOnly:true,sameSite:'Lax'});
    for(const route of routes){
      await send('Page.navigate',{url:'http://localhost:5173'+route});
      await waitFor(`document.querySelector('.nav-links a[href="/user"]') && document.querySelector('a[href^="/user/book"]')`);checks++;
    }
  } finally { const deleted=await fetch(base+'/user/profile',{method:'DELETE',headers:{Cookie:userCookie,Origin:'http://localhost:5173'}});assert.equal(deleted.status,200); }
  console.log('PASS: '+checks+' role-aware booking visibility checks; admin hidden, guest/customer visible, mobile and desktop layouts.');
} catch(error){console.error(error.message);process.exitCode=1;}
finally{if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});clearInterval(keepAlive);socket?.close();browser.kill();}
