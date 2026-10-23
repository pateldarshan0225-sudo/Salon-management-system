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

  const response=await fetch(base+'/auth/register',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({name:'Booking regression QA',email:'booking-regression-'+Date.now()+'@example.com',phone:'9000088888',password:'BookingTest123',gender:'Other'})});
  assert.equal(response.status,201);
  const cookie=response.headers.get('set-cookie').split(';')[0];const split=cookie.indexOf('=');
  const request=async route=>{const result=await fetch(base+route,{headers:{Cookie:cookie}});assert.equal(result.status,200);return (await result.json()).data;};
  try {
    await send('Network.enable');await send('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:'http://localhost:5173',httpOnly:true,sameSite:'Lax'});
    const service=(await request('/public/services?limit=100')).items.find(s=>s.duration<=60);
    const specialist=(await request('/public/staff?limit=100')).items.find(s=>s.categoryId._id===service.categoryId._id);
    const dates=[];
    for(let day=1;day<=10&&dates.length<2;day++){
      const value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+day*86400000));
      if((await request('/user/slots?staffId='+specialist._id+'&date='+value+'&duration='+service.duration)).length)dates.push(value);
    }
    assert.equal(dates.length,2);
    const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate('Boolean('+expression+')'))return;await pause(100);}throw new Error('Timed out: '+expression);};
    const button=async text=>{await evaluate('[...document.querySelectorAll(".booking-layout section button")].find(b=>b.textContent.startsWith('+JSON.stringify(text)+')).click()');await pause(100);};
    const fill=async(selector,value)=>{await evaluate('(() => {const el=document.querySelector('+JSON.stringify(selector)+');Object.getOwnPropertyDescriptor(el.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype,"value").set.call(el,'+JSON.stringify(value)+');el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));})()');await pause(100);};
    for(const specific of [false,true]){
      await send('Page.navigate',{url:'http://localhost:5173/user/book?service='+service._id});
      await waitFor('document.querySelector(".service-choice.selected")');
      await button('Choose a Time');
      if(specific)await fill('.booking-layout section select',specialist._id);
      await fill('.booking-layout input[type=date]',dates[0]);
      await waitFor('document.querySelector(".slots button") && !document.querySelector(".booking-layout .loader-wrap")');
      await evaluate('document.querySelector(".slots button").click()');await pause(100);
      let selected=await evaluate('document.querySelector(".slots button.active").textContent');
      await button('Review Booking');
      await waitFor('document.querySelector(".booking-layout section h2").textContent.includes("almost here")');
      assert.ok(await evaluate('document.querySelector(".booking-layout section p").textContent.includes('+JSON.stringify('at '+selected)+')'),'Review must retain selected start time');
      await button('Back');
      await waitFor('document.querySelector(".slots button.active") && !document.querySelector(".booking-layout .loader-wrap")');
      assert.equal(await evaluate('document.querySelector(".slots button.active").textContent'),selected,'Back must preserve a still-available slot');
      await fill('.booking-layout input[type=date]',dates[1]);
      await waitFor('document.querySelector(".slots button") && !document.querySelector(".booking-layout .loader-wrap")');
      assert.equal(await evaluate('document.querySelectorAll(".slots button.active").length'),0,'Changing date must clear the old slot');
      assert.ok(await evaluate('[...document.querySelectorAll(".booking-layout section button")].find(b=>b.textContent.startsWith("Review Booking")).disabled'));
      await evaluate('document.querySelector(".slots button").click()');await pause(100);
      selected=await evaluate('document.querySelector(".slots button.active").textContent');
      await button('Review Booking');await pause(200);
      await button('Confirm Appointment');
      await waitFor('location.pathname.startsWith("/user/appointments/") && document.querySelector("h1")?.textContent.includes("Appointment #")');
      const appointmentId=await evaluate('location.pathname.split("/").at(-1)');
      const detail=await request('/user/appointments/'+appointmentId);
      assert.equal(detail.appointment.startTime,selected);assert.equal(detail.appointment.appointmentDate,dates[1]);
      if(specific)assert.equal(detail.appointment.staffId._id,specialist._id);
    }
    console.log('PASS: Any/named specialist bookings; time persists through review/back, date changes invalidate selection, and confirmed appointments store the selected time.');
  } finally {
    const removed=await fetch(base+'/user/profile',{method:'DELETE',headers:{Cookie:cookie,Origin:'http://localhost:5173'}});assert.equal(removed.status,200);
  }
} catch(error){console.error(error.message);process.exitCode=1;}
finally{if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});clearInterval(keepAlive);socket?.close();browser.kill();}
