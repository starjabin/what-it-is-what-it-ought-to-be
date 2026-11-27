# GAP CONTROLS AI security operations — implementation and acceptance charter

Scope: draft development branch, synthetic staging only. No production release authorization.

## KS-SEC-01: Endpoint and execution isolation
Security Operations verifies managed devices, supported OS and updates, EDR/XDR health, encrypted disks, MFA/passkeys, restricted admin rights, credential manager and device inventory. Agents receive task-scoped ephemeral access, never home directories or production secrets. Default deny outbound traffic; approved provider egress only via server-side broker. Never mount a host Docker socket or personal SSH directory. The supplied sandbox script runs fixed tests without network, as non-root, read-only, cap-drop, resource-limited, no pull, with only the production code directory mounted. The operator must use a scrubbed checkout with no local secrets, .env files or unrelated files and independently approve the image digest; a digest is not a signature. Sandbox and endpoint EDR deployment still require real operator evidence. Stop execution on unmanaged endpoints.

## KS-SEC-04/05: Identity and data policy
Verified session actor, server-derived org and project membership, explicit contract, current reviewed records, minimal delegated capabilities. No arbitrary shell/network/MCP/email/approval. Public or synthetic records only for staging; classification cannot come from a browser claim. DLP and injection screening are heuristic, not comprehensive; block suspicious content rather than silently change contract facts. Unscanned document uploads, confidential records and live model extraction stay held. Validate model output structure and citation scope; separate human acceptance.

## KS-SEC-06/07: Execution and data integrity
Reserve before dispatch, debit each attempt, validate current evidence and obligations, persist candidate and related records in one transaction. Use approved raw model adapter only behind the controlled pipeline (avoid double debit). Replay returns the original candidate; no automatic confirmation. Legacy live AI endpoints remain explicitly held. Use only a dedicated staging connection and verified real session identity once bound; no production credential or synthetic identity in a live app. Monetary cap and actual provider failover are release gates. Full production schema, policies and triggers must be tested before promotion.

## KS-SEC-08: Incident response runbook
1. Detect: suspicious credential/PII pattern, injection, repeated denial, abnormal allowance use, unapproved artifact, failed audit, mismatched evidence or unexpected network access. Do not log raw source or secrets.
2. Contain: disable controlled dispatch at server policy; stop agent/queue, deny outbound access, isolate affected workstation using EDR, revoke affected provider/API/session credentials through approved owner. In-flight provider requests may not be reversible.
3. Preserve: retain scoped request ID, metadata event, timestamps, relevant commit and artifact fingerprints, access and provider audit records with restricted permissions; no copy to public repository.
4. Investigate: assess affected tenants, documents, credentials and downstream actions; distinguish attempted and actual disclosure. Follow contractual/regulatory incident notifications with authorized privacy/security personnel.
5. Recover: rotate credentials, verify trusted artifacts, restore from proven backup where needed, retest controls and obtain independent release approval. Never erase the original incident record.
6. Learn: update test corpus, policy, training and risk register. Security Operations owns response; independently verify incident closure.
Current code emits enumerated, scoped metadata only, supports stop policy, and includes restricted append-only application RPC candidate. SIEM export, off-database retention and alert thresholds require deployment and drill. A DB owner can modify records; this is not cryptographically immutable logging.

## KS-SEC-09: Red-team acceptance
Independent QA runs synthetic evidence with instruction override, hidden Unicode, credential and PII patterns, cross-tenant/project access, stale evidence, self-approval, malicious tools, unapproved model, quota failures, output injection and audit failures. Verify rejection before external dispatch, no partial candidate, no raw secret in events. Extend to encoded/multilingual attacks, files, images, indirect instructions, tool poisoning, dependency compromise, signed URL leakage, live session revocation and provider failure. Automated negative tests are not an independent red-team exercise.

## KS-SEC-10: Competence center charter
Appoint AI Security Champion, Security Operations lead, DevSecOps, Identity Architect, Backend/Database Engineering, Compliance and Independent QA. Named individuals, backup owners and signed decisions remain organization tasks. Champion maintains training and control register; security operations runs drills; independent QA may veto a release. Monthly security review and after significant provider/dependency changes; quarterly simulated incident drill. Review current applicable laws, processing and confidentiality obligations with qualified compliance personnel.

Training curriculum and evidence:
| Topic | Assessment | Required outcome |
| --- | --- | --- |
| Prompt injection and artifact trust | Identify untrusted instructions and deny unauthorized tools | All critical questions correct |
| Evidence and hallucination | Cite original clause and distinguish observation/inference | No unsupported confirmation |
| Data confidentiality | Classify source, identify secrets/PII and approved processing | No prohibited disclosure |
| Identity and approvals | Select proper tenant and independent reviewer | No self-approval |
| Supply chain | Explain pinned inventory, scripts, signatures and quarantine | Reject an unapproved package |
| Incident response | Execute synthetic stop, report and preserve audit IDs | Demonstrate containment |
Record learner, role, module/version, assessment result, date, independent evaluator and re-assessment date in controlled HR/training records, not the public repo. Minimum 80% overall and all critical safety items correct; failed participants retrain before privileged access. Training content prepared, not delivered or certified.

## Release authority
Machine checks validate the shape of the register and deny release when any of ten controls lacks independent acceptance; they are not signed human evidence. Required protected branches, independent reviewers, approved artifacts and external evidence must be established separately. No release from this draft. Before enabling production, replace the staging-only hold with an independently reviewed integration, not an environment bypass.
