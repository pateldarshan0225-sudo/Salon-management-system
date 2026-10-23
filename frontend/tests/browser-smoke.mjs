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
  const checks=[];
  for(const width of [360,768,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
    for(const route of ['/','/services','/about','/team','/offers','/contact','/login','/register','/admin/login','/unknown-page','/user/book','/admin']){
      await send('Page.navigate',{url:`http://127.0.0.1:5173${route}`}); await pause(route==='/'?1800:450);
      const metrics=await evaluate(`({title:document.querySelector('h1')?.textContent, width:innerWidth, documentWidth:document.documentElement.scrollWidth, path:location.pathname, images:[...document.images].filter(i=>i.complete && i.naturalWidth===0).length})`);
      if(!metrics.title) console.error(await evaluate(`({body:document.body?.innerText.slice(0,2000),url:location.href})`));
      assert.ok(metrics.title,`${route} has a heading at ${width}px`);
      assert.ok(metrics.documentWidth<=width+1,`Horizontal overflow at ${route}, ${width}px: ${metrics.documentWidth}`);
      if(route==='/user/book')assert.equal(metrics.path,'/login');
      if(route==='/admin' || route==='/admin/login')assert.equal(metrics.path,'/login');
      if(route==='/login'){
        await evaluate(`document.querySelector('form button[type="submit"], form button.btn.full').click()`); await pause(50);
        assert.ok(await evaluate(`document.querySelectorAll('.field-error').length >= 2`),'Login shows inline validation');
        await evaluate(`document.querySelector('.password button').click()`); await pause(50);
        assert.equal(await evaluate(`document.querySelector('.password input').type`),'text');
      }
      if(route==='/'&&width===360){
        await evaluate(`document.querySelector('.menu-toggle').click()`); await pause(50);
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`),'true');
        await evaluate(`document.querySelector('.menu-toggle').click()`);
      }
      checks.push({route,width,...metrics});
      if(route==='/'){
        const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await writeFile(path.join(output,`home-${width}.png`),Buffer.from(screenshot.data,'base64'));
      }
    }
  }
  await writeFile(path.join(output,'browser-checks.json'),JSON.stringify(checks,null,2));
  console.log(`PASS: ${checks.length} public/guarded-route checks at 360, 768 and 1280 pixels; login validation, password visibility and mobile menu.`);
} catch(error){console.error(error.message);process.exitCode=1;}
finally{clearInterval(keepAlive);socket?.close();browser.kill();}
