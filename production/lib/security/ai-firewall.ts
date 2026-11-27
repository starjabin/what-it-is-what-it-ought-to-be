/** Conservative staging policy; heuristic defense in depth, not a complete DLP or injection detector. */
const rules:readonly [string,RegExp][]=[
 ["credential",/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/i],
 ["credential",/\b(?:password|api[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*[^\s,;]{4,}/i],
 ["credential",/postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i],
 ["personal-data",/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
 ["injection",/\b(?:ignore|disregard|override|forget)\b.{0,70}\b(?:previous|prior|system|developer|all)\b.{0,35}\b(?:instructions?|rules?|prompts?)\b/i],
 ["injection",/\b(?:reveal|print|send|exfiltrate|upload|transmit)\b.{0,90}\b(?:secrets?|credentials?|tokens?|system prompt|private keys?)\b/i],
 ["injection",/\b(?:execute|run)\b.{0,45}\b(?:shell|terminal|curl|powershell|bash|command|script)\b/i],
 ["injection",/<\/?(?:system|developer|tool_call|assistant)\b|\[INST\]/i]
];
export function inspectText(value:string):void {
 if(typeof value!=="string"||new TextEncoder().encode(value).length>48000)throw Error("AI firewall: size or type denied");
 const normal=value.normalize("NFKC").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,"").replace(/\s+/g," ");
 if(/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(normal))throw Error("AI firewall: control characters denied");
 for(const [reason,rule] of rules)if(rule.test(normal))throw Error("AI firewall: "+reason+" denied");
}
export function assertSafePayload(value:unknown):void {
 const encoded=JSON.stringify(value);
 if(typeof encoded!=="string"||new TextEncoder().encode(encoded).length>48000)throw Error("AI firewall: payload denied");
 let count=0;
 const walk=(v:unknown,depth:number):void=>{
  if(++count>5000||depth>12)throw Error("AI firewall: structure denied");
  if(typeof v==="string")inspectText(v);
  else if(Array.isArray(v))v.forEach(x=>walk(x,depth+1));
  else if(v&&typeof v==="object")for(const [k,x] of Object.entries(v)){inspectText(k);walk(x,depth+1);}
 };
 walk(value,0);
}
