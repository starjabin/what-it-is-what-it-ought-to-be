import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {verifyInventory} from "../security/verify-supply-chain.mjs";
const root=new URL("../",import.meta.url), read=p=>readFileSync(new URL(p,root),"utf8");
const input={packageJson:JSON.parse(read("package.json")),lockText:read("package-lock.json"),registry:JSON.parse(read("security/trusted-registry.json"))};
function modified(change){const l=JSON.parse(input.lockText);change(l);const lockText=JSON.stringify(l);const registry=structuredClone(input.registry);registry.packageInventory.sha256=createHash("sha256").update(lockText).digest("hex");return {...input,registry,lockText};}
test("actual lock inventory matches pinned manifest",()=>assert.equal(verifyInventory(input).packages,input.registry.packageInventory.count));
test("tampered bytes denied before parsing",()=>assert.throws(()=>verifyInventory({...input,lockText:input.lockText+" "}),/digest mismatch/));
test("external tarball and URL confusion denied even with recalculated digest",()=>{for(const url of ["https://evil.invalid/x.tgz","https://registry.npmjs.org@evil.invalid/x.tgz","http://registry.npmjs.org/x.tgz"])assert.throws(()=>verifyInventory(modified(l=>l.packages["node_modules/react"].resolved=url)));});
test("package substitutions and missing integrity denied",()=>{assert.throws(()=>verifyInventory(modified(l=>delete l.packages["node_modules/react"].integrity)));assert.throws(()=>verifyInventory(modified(l=>l.packages["node_modules/react"].resolved="https://registry.npmjs.org/other/-/other-1.0.0.tgz")));});
test("manifest version drift and lifecycle commands denied",()=>{const p=structuredClone(input.packageJson);p.dependencies.react="^19.3.1";assert.throws(()=>verifyInventory({...input,packageJson:p}));p.dependencies.react=input.packageJson.dependencies.react;p.scripts.postinstall="echo forbidden";assert.throws(()=>verifyInventory({...input,packageJson:p}));});
