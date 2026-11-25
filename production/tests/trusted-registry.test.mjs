import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {assertTrustedArtifact,assertApprovedModel,assertTrustedBytes,requireConfiguredModel} from "../lib/security/trusted-registry.ts";
const hash="sha256:"+"a".repeat(64);
const time=Date.parse("2026-11-25T00:00:00Z");
const request={kind:"skill",id:"test/skill",source:"repository:approved.md",version:"1.0.0",integrity:hash,environment:"staging",capabilities:["read"]};
const approved={...request,publisher:"Test",status:"approved",approval:{requestedBy:"author",reviewedBy:"reviewer",ticket:"SEC-1",expiresAt:"2027-01-01T00:00:00Z"}};
const deny=(req,cat)=>assert.throws(()=>assertTrustedArtifact(req,cat,time),/registry denied/);
test("exact reviewed artifact accepted",()=>assert.equal(assertTrustedArtifact(request,[approved],time).id,request.id));
test("unknown, duplicate, pending and revoked artifacts denied",()=>{deny(request,[]);deny(request,[approved,approved]);for(const status of ["pending","revoked"])deny(request,[{...approved,status}]);});
test("changed source version digest or environment denied",()=>{for(const [k,v] of Object.entries({source:"repository:other.md",version:"2",integrity:"sha256:"+"b".repeat(64),environment:"production"}))deny({...request,[k]:v},[approved]);});
test("unapproved capabilities or empty purpose denied",()=>{deny({...request,capabilities:["read","write"]},[approved]);deny({...request,capabilities:[]},[approved]);});
test("self-approval, expired and malformed approvals denied",()=>{for(const a of [{...approved.approval,reviewedBy:"author"},{...approved.approval,expiresAt:"2020-01-01"},{...approved.approval,expiresAt:"nonsense"},{...approved.approval,ticket:""}])deny(request,[{...approved,approval:a}]);});
test("unverified model and MCP denied by shipped registry",()=>{assert.throws(()=>assertApprovedModel("openai","gpt-6.1-sol",hash,"contract-review","staging"));assert.throws(()=>assertTrustedArtifact({...request,kind:"mcp",id:"external-mcp"}));});
test("invalid fingerprint denied even when recorded",()=>deny({...request,integrity:"sha256:invalid"},[{...approved,integrity:"sha256:invalid"}]));

test("content hash measured from bytes detects tampering",()=>{const bytes=Buffer.from("trusted skill");const integrity="sha256:"+createHash("sha256").update(bytes).digest("hex");const {integrity:_,...req}=request;const art={...approved,integrity};assert.equal(assertTrustedBytes(req,bytes,[art],time).id,req.id);assert.throws(()=>assertTrustedBytes(req,Buffer.from("modified skill"),[art],time));});
test("configured model without separate approval fails closed",()=>assert.throws(()=>requireConfiguredModel("gpt-6.1-sol","contract-review")));
