export const WORKSPACE_COOKIE="gap-active-workspace";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function verifiedMfaSubject(claims:unknown):string|null{
 if(!claims||typeof claims!=="object")return null;const c=claims as Record<string,unknown>;
 return typeof c.sub==="string"&&uuid.test(c.sub)&&c.aal==="aal2"&&c.role==="authenticated"?c.sub:null;
}
/** Must receive memberships freshly fetched under the verified identity. Cookie is an untrusted selector only. */
export function chooseWorkspace<T extends {organization_id:string}>(members:readonly T[],selection:unknown):T|null{
 if(typeof selection==="string"&&uuid.test(selection)){const matches=members.filter(m=>m.organization_id===selection);return matches.length===1?matches[0]:null}
 return members.length===1?members[0]:null;
}
