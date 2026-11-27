/** Deterministic finish-to-start CPM kernel, durations in working-day units.
 * No calendars, resource leveling, date/time zones, lag, actuals or persisted project authorization.
 * Output is a planning candidate, not an approved schedule. */
export type Activity={id:string;duration:number;predecessors:readonly string[]};
export type Timing={id:string;earlyStart:number;earlyFinish:number;lateStart:number;lateFinish:number;float:number;critical:boolean};
export function calculateSchedule(activities:readonly Activity[]):{duration:number;activities:Timing[]}{
 if(!Array.isArray(activities)||!activities.length||activities.length>1000)throw Error("Expected 1–1000 activities");
 const nodes=new Map<string,Activity>();
 for(const a of activities){
  if(typeof a.id!=="string"||!a.id.trim()||a.id.length>128||nodes.has(a.id)||!Number.isSafeInteger(a.duration)||a.duration<0||a.duration>36500||!Array.isArray(a.predecessors)||a.predecessors.length>1000||new Set(a.predecessors).size!==a.predecessors.length)throw Error("Invalid activity");
  nodes.set(a.id,{...a,predecessors:[...a.predecessors]});
 }
 const outgoing=new Map([...nodes.keys()].map(id=>[id,[] as string[]]));
 const degree=new Map<string,number>();
 for(const a of nodes.values()){
  degree.set(a.id,a.predecessors.length);
  for(const id of a.predecessors){if(!nodes.has(id)||id===a.id)throw Error("Unknown or self dependency");outgoing.get(id)!.push(a.id)}
 }
 const queue=[...nodes.keys()].filter(id=>degree.get(id)===0),order:string[]=[],timing=new Map<string,Timing>();
 for(let i=0;i<queue.length;i++){
  const id=queue[i],a=nodes.get(id)!;
  const earlyStart=a.predecessors.reduce((m,p)=>Math.max(m,timing.get(p)!.earlyFinish),0);
  timing.set(id,{id,earlyStart,earlyFinish:earlyStart+a.duration,lateStart:0,lateFinish:0,float:0,critical:false});order.push(id);
  for(const successor of outgoing.get(id)!){const d=degree.get(successor)!-1;degree.set(successor,d);if(d===0)queue.push(successor)}
 }
 if(order.length!==nodes.size)throw Error("Dependency cycle");
 const duration=Math.max(...[...timing.values()].map(t=>t.earlyFinish));
 for(const id of [...order].reverse()){
  const t=timing.get(id)!,s=outgoing.get(id)!;
  t.lateFinish=s.length?Math.min(...s.map(x=>timing.get(x)!.lateStart)):duration;
  t.lateStart=t.lateFinish-nodes.get(id)!.duration;t.float=t.lateStart-t.earlyStart;t.critical=t.float===0;
 }
 return {duration,activities:[...nodes.keys()].map(id=>timing.get(id)!)};
}
