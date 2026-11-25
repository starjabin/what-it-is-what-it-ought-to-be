/** Local navigation only. Reject ambiguous encoded paths, separators and control characters. */
export function safeReturnPath(value:unknown,fallback="/dashboard"):string{
 if(typeof value!=="string"||value.length>2048||!value.startsWith("/")||value.startsWith("//")||/[\\\x00-\x20\x7f]/.test(value))return fallback;
 const path=value.split(/[?#]/,1)[0];
 if(!/^\/(?:[A-Za-z0-9_.~-]+\/)*[A-Za-z0-9_.~-]*$/.test(path)||path.split("/").some(p=>p==="."||p===".."))return fallback;
 const allowed=new Set(["/dashboard","/flow","/projects","/contracts","/documents","/obligations","/evidence","/analyst","/gaps","/actions","/reports","/team","/communication","/notifications","/assistant","/settings/ai","/audit","/billing","/onboarding","/staging-graph","/workspace-select"]);
 if(!allowed.has(path)&&!/^\/gaps\/[a-f0-9-]{36}$/i.test(path)&&!/^\/join\/[A-Za-z0-9_-]{1,256}$/.test(path))return fallback;
 return value;
}
