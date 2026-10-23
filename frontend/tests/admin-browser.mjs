// No browser package needed: use Chrome's built-in debugging protocol and Node WebSocket.
// Start Vite first. CHROME_PATH may override the standard Windows Chrome location.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, unlink } from 'node:fs/promises';
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
  const records = {};
  const uploadedFiles = new Set();
  const suffix = Date.now().toString();
  const get = async route => { const response=await fetch(base+route,{headers:{Cookie:cookie}});assert.ok(response.ok);return (await response.json()).data; };
  const click = async expression => { await evaluate(expression+'.click()');await pause(100); };
  const fill = async (key,value) => { await evaluate('(() => {const el=document.querySelector('+JSON.stringify('.editor [name="'+key+'"]')+'); const prototype = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype,"value").set.call(el,'+JSON.stringify(String(value))+');el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input",{bubbles:true}));})()');await pause(60); };
  const waitFor = async (expression,label) => { for(let i=0;i<80;i++){if(await evaluate(expression))return;await pause(100);}throw new Error(label); };
  const navigate = async entity => {await send('Page.navigate',{url:'http://localhost:5173/admin/'+entity});await waitFor('!!document.querySelector(".page-title button")','Admin page did not load');await waitFor('!document.querySelector(".loader-wrap")','Table did not load');};
  const chooseImage = async () => {
    await evaluate(`(() => { const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;canvas.getContext('2d').fillRect(0,0,20,20);const bytes=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'test-image.png',{type:'image/png'}));const input=document.querySelector('.editor input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor('document.querySelector(".image-preview img")?.src.startsWith("blob:") && !document.querySelector(".editor-fields").disabled','Image preview did not load');
  };
  const rowSelector = entity => '[...document.querySelectorAll("tbody tr")].find(row=>row.innerText.includes('+JSON.stringify(records[entity].name || records[entity].title)+'))';
  try {
    for(const entity of ['categories','services','staff','offers']){
      await navigate(entity);await click('document.querySelector(".page-title button")');
      await click('document.querySelector(".editor button[type=submit]")');
      assert.ok(await evaluate('document.querySelectorAll(".editor .field-error").length > 0'),'Empty form must show inline errors');
      const name = 'AAA QA '+entity+' '+suffix;
      const fields = entity === 'categories' ? {name,description:'Browser CRUD check'} : entity === 'services' ? {name,categoryId:records.categories._id,price:'0.50',duration:'30'} : entity === 'staff' ? {name,categoryId:records.categories._id,phone:'9876543210',experienceYears:'0'} : {title:name,code:'QA'+suffix,discountPercent:'15',validFrom:'2026-10-01',validTo:'2027-10-01'};
      for(const [key,value] of Object.entries(fields))await fill(key,value);
      if(entity !== 'offers') {
        assert.ok(await evaluate('!document.querySelector(".editor input[type=url]")'),'Use a file chooser, not a URL field');
        await chooseImage();
      }
      if(entity==='staff'){
        await fill('phone','12');await fill('endTime','08:00');await click('document.querySelector(".editor button[type=submit]")');
        assert.ok(await evaluate('!!document.querySelector("[name=phone][aria-invalid=true]") && !!document.querySelector("[name=endTime][aria-invalid=true]")'));
        await fill('phone','9876543210');await fill('endTime','18:00');
      }
      if(entity==='offers'){
        await fill('validTo','2026-09-01');await click('document.querySelector(".editor button[type=submit]")');
        assert.ok(await evaluate('!!document.querySelector("[name=validTo][aria-invalid=true]")'));
        await fill('validTo','2027-10-01');
      }
      await click('document.querySelector(".editor [role=switch]")');
      await click('document.querySelector(".editor button[type=submit]")');
      await waitFor('!document.querySelector(".editor")','Create failed for '+entity);
      await waitFor('!document.querySelector(".loader-wrap")','List reload failed');
      records[entity]=(await get('/admin/'+entity+'?limit=100')).items.find(row=>(row.name||row.title)===name);
      assert.ok(records[entity],'Created record missing');assert.equal(records[entity].isActive,false);
      if(entity !== 'offers') { assert.match(records[entity].image,/^\/uploads\/[a-f\d-]{36}\.png$/);uploadedFiles.add(records[entity].image); }
      await click(rowSelector(entity)+'.querySelector("[role=switch]")');
      await waitFor('!document.querySelector(".loader-wrap") && document.querySelector(".alert.success")?.innerText.includes("active")','Toggle failed');
      assert.equal((await get('/admin/'+entity+'/'+records[entity]._id)).isActive,true);
      await click(rowSelector(entity)+'.querySelector("button.btn")');
      if(entity !== 'offers') {
        await waitFor('document.querySelector(".image-preview img")?.complete && document.querySelector(".image-preview img")?.naturalWidth > 0','Saved image failed to display');
        await chooseImage();
      }
      await fill(entity==='offers'?'title':'name',name+' updated');
      await click('document.querySelector(".editor [role=switch]")');
      await click('document.querySelector(".editor button[type=submit]")');
      await waitFor('!document.querySelector(".editor")','Update failed');
      records[entity]=await get('/admin/'+entity+'/'+records[entity]._id);
      if(entity !== 'offers') uploadedFiles.add(records[entity].image);
      assert.equal(records[entity].isActive,false);assert.equal(records[entity].name||records[entity].title,name+' updated');
    }
    await navigate('categories');
    await click(rowSelector('categories')+'.querySelector(".danger-text")');
    await click('document.querySelector("dialog .btn.danger")');
    await waitFor('document.querySelector(".alert.error")?.innerText.includes("related")','Referenced-category delete should be blocked');
    for(const width of [360,768,1280]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
      await navigate('staff');await click(rowSelector('staff')+'.querySelector("button.btn")');
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Admin form overflow at '+width);
    }
    await click('document.querySelector(".image-preview button")');
    assert.ok(await evaluate('!document.querySelector(".image-preview img")'),'Remove image must clear the preview');
    await click('document.querySelector(".editor button[type=submit]")');
    await waitFor('!document.querySelector(".editor")','Saving image removal failed');
    assert.equal((await get('/admin/staff/'+records.staff._id)).image,'');
    for(const entity of ['services','staff','offers','categories']){
      await navigate(entity);await click(rowSelector(entity)+'.querySelector(".danger-text")');
      assert.ok(await evaluate('document.querySelector("dialog").open'),'Delete needs confirmation');
      await click('document.querySelector("dialog .btn.danger")');
      await waitFor('!document.querySelector("dialog").open && !document.querySelector(".loader-wrap")','Delete failed');
      assert.ok(!(await get('/admin/'+entity+'?limit=100')).items.some(row=>row._id===records[entity]._id));
      delete records[entity];
    }
    console.log('PASS: Authenticated browser CRUD, form/list status switches, inline validation, delete confirmations, protected deletion and 360/768/1280px admin layouts.');
  } finally {
    for(const entity of ['services','staff','offers','categories']) if(records[entity]) await fetch(base+'/admin/'+entity+'/'+records[entity]._id,{method:'DELETE',headers:{Cookie:cookie,Origin:'http://localhost:5173'}});
    for(const image of uploadedFiles) { assert.match(image,/^\/uploads\/[a-f\d-]{36}\.png$/);await unlink(path.resolve('../backend',image.slice(1))); }
    await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'http://localhost:5173'}});
  }
} catch(error){console.error(error.message);if(socket?.readyState===WebSocket.OPEN)console.error(await evaluate('({url:location.href,text:document.body?.innerText.slice(0,1200),html:document.body?.innerHTML.slice(0,1000)})').catch(()=>null));process.exitCode=1;}
finally{if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});clearInterval(keepAlive);socket?.close();browser.kill();}
