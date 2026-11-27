// Narrow pre-install scan of tracked files; never prints matched secret values.
import {execFileSync} from "node:child_process";
import {readFileSync,statSync} from "node:fs";
const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{60,}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,/\bAKIA[A-Z0-9]{16}\b/];
let bad=0;for(const f of files){if(/(^|\/)\.env(?:\..*)?$/.test(f)&&!f.endsWith(".env.example")){console.error("Forbidden environment file:",f);bad++;continue;}if(f==="production/security/scan-tracked-secrets.mjs")continue;const stat=statSync(f);if(!stat.isFile()||stat.size>2_000_000)continue;const b=readFileSync(f);if(b.includes(0))continue;if(patterns.some(p=>p.test(b.toString("utf8")))){console.error("Potential credential in tracked file:",f);bad++;}}
if(bad)process.exit(1);console.log("Tracked-file basic credential pattern scan passed");
