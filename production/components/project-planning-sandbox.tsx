"use client";
import {useMemo,useState} from "react";
import {calculateSchedule,type Activity} from "@/lib/planning/critical-path";
import {StandardTable,TableRegion} from "@/components/standard-primitives";
const template:Activity[]=[
 {id:"Engineering",duration:5,predecessors:[]},
 {id:"Procurement",duration:8,predecessors:["Engineering"]},
 {id:"Dismantling",duration:3,predecessors:["Engineering"]},
 {id:"Installation",duration:6,predecessors:["Procurement","Dismantling"]},
 {id:"Testing",duration:2,predecessors:["Installation"]},
 {id:"Commissioning",duration:2,predecessors:["Testing"]},
 {id:"In service",duration:0,predecessors:["Commissioning"]}
];
export function ProjectPlanningSandbox(){
 const [activities,setActivities]=useState(template);
 const computed=useMemo(()=>{try{return {result:calculateSchedule(activities),error:null}}catch{return {result:null,error:"Check all durations and dependencies."}}},[activities]);
 const scale=Math.max(1,computed.result?.duration??0);
 return <section className="card" aria-labelledby="cpm-title" style={{marginTop:24}}>
 <div className="cardHead"><div><h2 id="cpm-title">Project lifecycle planning sandbox</h2><p className="muted">Editable synthetic planning candidate. Not saved to a project, not an approved schedule. Finish-to-start dependencies; working-day durations only.</p></div><button type="button" className="btn" onClick={()=>setActivities(template)}>Reset example</button></div>
 <div className="cardBody">
 <p role="status" aria-live="polite">{computed.error??("Estimated duration: "+computed.result?.duration+" working days")}</p>
 <TableRegion label="Critical path candidate"><StandardTable><thead><tr><th scope="col">Activity</th><th scope="col">Predecessors</th><th scope="col">Days</th><th scope="col">Start / finish</th><th scope="col">Float</th><th scope="col">Timeline</th></tr></thead><tbody>
 {activities.map((a,i)=>{const t=computed.result?.activities.find(x=>x.id===a.id);return <tr key={a.id}><th scope="row">{a.id}</th><td>{a.predecessors.join(", ")||"—"}</td><td><input aria-label={a.id+" duration in working days"} type="number" min={0} max={36500} step={1} value={a.duration} onChange={e=>{const n=e.target.valueAsNumber;setActivities(old=>old.map((x,j)=>j===i?{...x,duration:Number.isFinite(n)?n:0}:x))}} style={{maxWidth:90}}/></td><td>{t?t.earlyStart+" / "+t.earlyFinish:"—"}</td><td>{t?t.float:"—"}</td><td style={{minWidth:150}}>{t&&<><div style={{position:"relative",height:12,background:"#94a3b833",borderRadius:4}}><span style={{position:"absolute",left:100*t.earlyStart/scale+"%",width:100*(t.earlyFinish-t.earlyStart)/scale+"%",minWidth:4,height:12,borderRadius:3,background:t.critical?"#dc2626":"#2563eb"}}/></div><small>{t.critical?"Critical":"Non-critical"}{a.duration===0?" · milestone":""}</small></>}</td></tr>})}
 </tbody></StandardTable></TableRegion>
 <p className="muted">Calendars, resource leveling, actual progress, persisted dependencies, contract milestones and CAD/GIS are outside this sandbox.</p></div></section>
}
