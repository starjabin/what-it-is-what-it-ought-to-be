export class RequestContractError extends Error {
 readonly status:number;readonly code:string;
 constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}
}
export async function readBoundedJson(request:Request,maxBytes:number):Promise<unknown>{
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>1048576)throw Error("Invalid request budget");
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")throw new RequestContractError(415,"JSON_REQUIRED","JSON required");
 const length=request.headers.get("content-length");
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw new RequestContractError(413,"BODY_LIMIT","Request too large");
 if(!request.body)throw new RequestContractError(400,"INVALID_JSON","JSON body required");
 const reader=request.body.getReader();let total=0;const parts:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){void reader.cancel().catch(()=>{});throw new RequestContractError(413,"BODY_LIMIT","Request too large");}parts.push(value)}}
 finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
 try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes))}catch{throw new RequestContractError(400,"INVALID_JSON","Malformed JSON")}
}
export function parseGraphInput(body:unknown):{requestId:string;observed:number;required:number}{
 if(!body||typeof body!=="object"||Array.isArray(body))throw new RequestContractError(400,"INVALID_INPUT","Invalid review input");
 const b=body as Record<string,unknown>;
 if(Object.keys(b).length!==3||typeof b.requestId!=="string"||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(b.requestId)||typeof b.observed!=="number"||typeof b.required!=="number"||![b.observed,b.required].every(v=>Number.isInteger(v)&&v>=1&&v<=10000))throw new RequestContractError(400,"INVALID_INPUT","Use whole millimeter values from 1 to 10,000");
 return {requestId:b.requestId,observed:b.observed,required:b.required};
}
