import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const fail=(m)=>{throw new Error("Supply chain policy: "+m)};
const exact=/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;
const integrity=/^sha512-[A-Za-z0-9+/]{86}==$/;
export function verifyInventory({packageJson,lockText,registry}){
  const p=registry.packageInventory;
  if(registry.schemaVersion!==1||registry.policy!=="deny-by-default"||p?.path!=="package-lock.json"||p.registry!=="https://registry.npmjs.org/"||!["candidate","approved"].includes(p.state))fail("invalid inventory policy");
  if(createHash("sha256").update(lockText).digest("hex")!==p.sha256)fail("lock digest mismatch");
  const lock=JSON.parse(lockText);
  if(lock.lockfileVersion!==3||!lock.packages||!lock.packages[""])fail("lock version invalid");
  const root=lock.packages[""];
  if(root.name!==packageJson.name||root.version!==packageJson.version)fail("root identity mismatch");
  for(const k of ["dependencies","devDependencies","optionalDependencies","peerDependencies"]){
    const direct=packageJson[k]??{}, recorded=root[k]??{};
    if(JSON.stringify(Object.entries(direct).sort())!==JSON.stringify(Object.entries(recorded).sort()))fail("manifest differs from lock");
    for(const [name,version] of Object.entries(direct)){
      if(!exact.test(version)||lock.packages["node_modules/"+name]?.version!==version)fail("direct dependency not pinned");
    }
  }
  if(Object.keys(packageJson.scripts??{}).some(s=>/^(preinstall|install|postinstall|prepare|prepublish|prepublishOnly|postprepare|preprepare|prebuild|postbuild|pretypecheck|posttypecheck)$/.test(s)))fail("unapproved root lifecycle script");
  const deps=Object.entries(lock.packages).filter(([name])=>name!=="");
  if(deps.length!==p.count||!deps.length)fail("inventory count mismatch");
  for(const [path,meta] of deps){
    if(!/^(?:node_modules\/(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+)(?:\/node_modules\/(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+)*$/i.test(path)||meta.link||!exact.test(meta.version)||!integrity.test(meta.integrity))fail("invalid package identity or integrity");
    const u=new URL(meta.resolved);
    const name=path.split("node_modules/").at(-1);
    const tar=name.split("/").at(-1);
    if(u.protocol!=="https:"||u.host!=="registry.npmjs.org"||u.username||u.password||u.search||u.hash||decodeURIComponent(u.pathname)!=="/"+name+"/-/"+tar+"-"+meta.version+".tgz")fail("unapproved tarball origin or identity");
  }
  return {packages:deps.length,status:p.state,sha256:p.sha256};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const root=new URL("../",import.meta.url);
  const read=p=>readFileSync(new URL(p,root),"utf8");
  console.log("Verified dependency inventory",verifyInventory({packageJson:JSON.parse(read("package.json")),lockText:read("package-lock.json"),registry:JSON.parse(read("security/trusted-registry.json"))}));
}
