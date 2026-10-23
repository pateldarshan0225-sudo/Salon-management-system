// No browser package needed: use Chrome's built-in debugging protocol and Node WebSocket.
// Start Vite first. CHROME_PATH may override the standard Windows Chrome location.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
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
const output = path.resolve('test-results'); await mkdir(output,{recursive:true});
const send = (method,params={}) => new Promise((resolve,reject)=>{ const id=++next; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Browser command timed out: ${method}`));},10000); pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params})); });
async function evaluate(expression) { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
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

  const waitFor=async expression=>{for(let i=0;i<70;i++){if(await evaluate('Boolean('+expression+')'))return;await pause(100);}throw new Error('Preloader did not finish correctly');};
  for(const width of [360,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
    await send('Page.navigate',{url:'http://localhost:5173/'});await pause(200);
    assert.ok(await evaluate('!!document.getElementById("site-preloader")'),'Initial brand screen should exist');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Preloader must fit viewport');
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,'preloader-'+width+'.png'),Buffer.from(screenshot.data,'base64'));
    await waitFor('!document.getElementById("site-preloader") && !document.getElementById("root").hasAttribute("inert")');
    assert.ok(await evaluate('!document.getElementById("root").hasAttribute("aria-hidden")'));
    await evaluate('document.querySelector(\'.nav-links a[href="/about"]\').click()');await pause(300);
    assert.equal(await evaluate('!!document.getElementById("site-preloader")'),false,'Internal navigation must not restart the splash');
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.navigate',{url:'http://localhost:5173/'});await waitFor('!document.getElementById("site-preloader") && !!document.querySelector("h1")');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/auth/me',requestStage:'Request'}]});
  await send('Page.navigate',{url:'http://localhost:5173/'});await pause(500);
  assert.ok(await evaluate('!!document.getElementById("site-preloader")'),'Slow auth should retain the loading screen briefly');
  await waitFor('!document.getElementById("site-preloader") && !document.getElementById("root").hasAttribute("inert")');
  await send('Fetch.disable');
  console.log('PASS: Branded preloader at 360/1280px, dismisses and unlocks page, does not repeat during navigation, respects reduced motion and handles slow auth.');
} catch(error){console.error(error.message);process.exitCode=1;}
finally{if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});clearInterval(keepAlive);socket?.close();browser.kill();}
