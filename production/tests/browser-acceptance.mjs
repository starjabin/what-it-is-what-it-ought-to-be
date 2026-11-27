// Run only in isolated CI with no real credentials. Native Chrome DevTools Protocol, no npm browser dependencies.
import assert from "node:assert/strict";
import {spawn,execFileSync} from "node:child_process";
import {mkdtempSync,rmSync,existsSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base="http://127.0.0.1:4173";
const cleanEnv={PATH:process.env.PATH,HOME:process.env.HOME,LANG:"C.UTF-8",NODE_ENV:"production",NEXT_TELEMETRY_DISABLED:"1"};
const root=mkdtempSync(join(tmpdir(),"gap-ui-"));
let chrome,server,ws;
const pending=new Map();let seq=0;
function executable(){for(const name of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){try{return execFileSync("which",[name],{encoding:"utf8"}).trim()}catch{}}throw Error("No Chromium browser on runner");}
async function until(fn,label,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const value=await fn();if(value)return value}catch{}await sleep(150)}throw Error("Timeout: "+label)}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout "+method))},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));})}
async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value}
async function click(text){assert.equal(await evaluate(`(()=>{const el=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!el||el.disabled)return false;el.click();return true})()`),true)}
let mock=false;let writes=0;
const records=[{request_id:"20000000-0000-4000-8000-000000000001",job_id:"20000000-0000-4000-8000-000000000002",observed:650,required:800,gap:150,outcome:"Under Review",created_at:"2026-11-25T18:00:00Z"},{request_id:"20000000-0000-4000-8000-000000000003",job_id:"20000000-0000-4000-8000-000000000004",observed:800,required:800,gap:0,outcome:"No discrepancy detected",created_at:"2026-11-25T18:00:01Z"}];
async function intercept(p){
 const u=new URL(p.request.url);if(u.origin!==base){await send("Fetch.failRequest",{requestId:p.requestId,errorReason:"BlockedByClient"});return}
 if(mock&&u.pathname==="/api/staging-graph"){
  let result={mode:"synthetic",runs:records};if(p.request.method==="POST"){writes++;const body=JSON.parse(p.request.postData);result={mode:"synthetic",run:{...records[0],request_id:body.requestId,observed:body.observed,required:body.required,gap:Math.max(0,body.required-body.observed),outcome:body.required>body.observed?"Under Review":"No discrepancy detected"}}}
  await send("Fetch.fulfillRequest",{requestId:p.requestId,responseCode:200,responseHeaders:[{name:"Content-Type",value:"application/json"},{name:"Cache-Control",value:"no-store"}],body:Buffer.from(JSON.stringify(result)).toString("base64")});return
 }
 // Chromium may cancel a non-mocked local resource while navigating between pages.
 // A stale interception ID in this one continuation path is not an application failure.
 // External blocking and synthetic API fulfillment still fail closed on every error.
 try { await send("Fetch.continueRequest",{requestId:p.requestId}); }
 catch(e) {
  if(e instanceof Error && e.message==="Invalid InterceptionId.") {
   console.log("INFO Chromium cancelled a local resource before continuation");
   return;
  }
  throw e;
 }
}
async function navigate(path,width){await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});await send("Page.navigate",{url:base+path});await until(async()=>await evaluate(`location.pathname===${JSON.stringify(path)}&&document.readyState==="complete"&&!!document.querySelector("main")`),"document "+path);await sleep(250)}
async function metrics(){return evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelectorAll("main").length,headings:document.querySelectorAll("h1").length,labels:[...document.querySelectorAll('input:not([type="hidden"])')].filter(e=>!e.labels?.length&&!e.getAttribute("aria-label")&&!e.getAttribute("aria-labelledby")).length,cls:window.__gapCls||0,lcp:window.__gapLcp||0})`)}
try{
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p","4173"],{env:cleanEnv,stdio:"ignore"});
 await until(async()=> (await fetch(base+"/staging-graph")).ok,"local app",30000);
 chrome=spawn(executable(),["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--disable-extensions","--no-first-run","--remote-debugging-address=127.0.0.1","--remote-debugging-port=0","--user-data-dir="+root,"about:blank"],{env:cleanEnv,stdio:"ignore"});
 const port=await until(()=>existsSync(join(root,"DevToolsActivePort"))&&readFileSync(join(root,"DevToolsActivePort"),"utf8").split("\n")[0],"browser debug port");
 const target=await (await fetch("http://127.0.0.1:"+port+"/json/new?about:blank",{method:"PUT"})).json();
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true})});
 ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}else if(m.method==="Fetch.requestPaused"){void intercept(m.params).catch(e=>{console.error("Interception failed",e.message);process.exitCode=1})}});
 await send("Page.enable");await send("Runtime.enable");await send("Fetch.enable",{patterns:[{urlPattern:"*"}]});
 await send("Page.addScriptToEvaluateOnNewDocument",{source:`window.__gapCls=0;window.__gapLcp=0;try{new PerformanceObserver(l=>{for(const x of l.getEntries())if(!x.hadRecentInput)window.__gapCls+=x.value}).observe({type:"layout-shift",buffered:true});new PerformanceObserver(l=>{for(const x of l.getEntries())window.__gapLcp=x.startTime}).observe({type:"largest-contentful-paint",buffered:true})}catch{}`});
 for(const path of ["/","/sign-in","/sign-up","/staging-graph"]){for(const width of [320,375,768,1024,1440]){await navigate(path,width);const m=await metrics();assert.ok(m.main>=1&&m.headings>=1,path+" landmark");assert.ok(m.scroll<=width+2,path+" horizontal overflow at "+width+": "+m.scroll);if(path!=="/")assert.equal(m.labels,0,path+" missing input labels");console.log("PASS viewport",path,width,"lab LCP",Math.round(m.lcp),"CLS",m.cls.toFixed(4));}}
 await until(async()=>await evaluate('document.body.innerText.includes("Unable to load staging history")'),"truthful missing database state");
 mock=true;await navigate("/staging-graph",375);
 await until(async()=>await evaluate('document.body.innerText.includes("Staging database connected")&&document.querySelectorAll("tbody tr").length===2'),"mock history");
 await click("Run controlled review");await until(async()=>await evaluate('document.body.innerText.includes("150 mm")'),"synthetic form result");assert.equal(writes,1);
 await evaluate('(()=>{const e=document.querySelector("#filter");e.value="clear";e.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await until(async()=>await evaluate('document.querySelectorAll("tbody tr").length===1'),"history filter");
 await click("العربية");await until(async()=>await evaluate('document.querySelector("[lang=ar][dir=rtl]")&&document.body.innerText.includes("سجل المراجعات")'),"Arabic RTL");
 for(const width of [320,375,768,1024,1440]){await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(100);const m=await metrics();assert.ok(m.scroll<=width+2,"RTL overflow "+width);console.log("PASS Arabic RTL viewport",width);}
 assert.equal(await evaluate('localStorage.getItem("gap-ui-locale")'),"ar");
 await navigate("/staging-graph",375);await until(async()=>await evaluate('!!document.querySelector("[lang=ar][dir=rtl]")&&localStorage.getItem("gap-ui-locale")==="ar"'),"locale persisted");
 for(const path of ["/sign-in","/sign-up"]){for(const width of [320,375,768,1024,1440]){await navigate(path,width);await until(async()=>await evaluate('!!document.querySelector("main[lang=ar][dir=rtl]")'),"Arabic auth");const m=await metrics();assert.ok(m.scroll<=width+2,"RTL auth overflow "+path+" "+width);assert.equal(m.labels,0);console.log("PASS Arabic authentication viewport",path,width);}}
 await navigate("/staging-graph",375);await until(async()=>await evaluate('!!document.querySelector("[lang=ar][dir=rtl]")'),"Arabic graph restored");
 await click("English");await until(async()=>await evaluate('!!document.querySelector("[lang=en][dir=ltr]")'),"English restored");
 await evaluate('document.activeElement?.blur();document.querySelector(".gapSkip").focus()');
 assert.equal(await evaluate('document.activeElement.classList.contains("gapSkip")'),true);
 console.log("PASS browser form, filter, persisted locale, RTL, keyboard skip link; mock API only, no cloud write. Lab metrics are not field CWV or full WCAG certification.");
}finally{ws?.close();chrome?.kill();server?.kill();try{rmSync(root,{recursive:true,force:true})}catch{}}
