import {readBoundedJson,RequestContractError} from "./request-contract.ts";
export type Field={max:number;required?:boolean;min?:number};
export async function readStringFields(request:Request,fields:Record<string,Field>,limit=8192):Promise<Record<string,string>>{
 const value=await readBoundedJson(request,limit);
 if(!value||typeof value!=="object"||Array.isArray(value))throw new RequestContractError(400,"INVALID_INPUT","Invalid request fields");
 const v=value as Record<string,unknown>,out:Record<string,string>=Object.create(null);
 for(const key of Object.keys(v))if(!Object.hasOwn(fields,key))throw new RequestContractError(400,"INVALID_INPUT","Unexpected request field");
 for(const [key,rule] of Object.entries(fields)){
  const item=v[key];if(item===undefined&&!rule.required){out[key]="";continue}
  if(typeof item!=="string")throw new RequestContractError(400,"INVALID_INPUT","Invalid request field");
  const s=item.trim();if(s.length>rule.max||s.length<(rule.min??(rule.required?1:0))||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s))throw new RequestContractError(400,"INVALID_INPUT","Invalid request field");
  out[key]=s;
 }
 return out;
}
