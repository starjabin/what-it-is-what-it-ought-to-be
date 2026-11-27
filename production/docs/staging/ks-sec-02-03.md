# KS-SEC-02 / KS-SEC-03 staging security acceptance

The Kaspersky editorial supplied by the project owner is the basis for these controls. Scope: development branch only. No production changes. Central policy: security/trusted-registry.json.

## Supply chain
- Pinned direct versions and 71 exact transitive lock entries resolved in a dedicated no-script, no-secret CI candidate job.
- CI validates lock SHA-256, manifest equality, package identity, exact npm registry tarball URLs and SHA-512 integrity before npm ci --ignore-scripts; vulnerability and registry signature checks, basic tracked-secret scan and SBOM generation.
- Inventory state candidate is not independent approval of any package. CI evaluates a credential-free build for review; promotion is prohibited until a security reviewer accepts the digest and scan evidence. Direct downloads from public npm are still not a corporate repository or malware scanner. Require an approved mirror/quarantine and malware/licensing review before production. SBOM is build output, not a signed attestation.
- Docker image and hosted runner image need separately approved immutable identities; the PostgreSQL readiness probe uses TCP to avoid init-only socket. Native CI uses public Git read, no third-party actions, no write permissions or secrets. Branch protection and reviewer enforcement are still unverified.

## Registry
- Model, skill, package inventory, MCP records; pending/revoked/unknown/mismatched/expired/self-approved entries are denied. Actual bytes can be hashed for local artifacts; remote model attestation is not weight verification.
- All existing identified OpenAI routes and staging specialist adapter require an approved model/task/environment and server-side fingerprint. Initial model/skill/MCP entries are pending, so model calls on this branch deliberately fail closed until independent approval. Do not set live keys for this test.
- The policy evaluator does not implement a dynamic skill/MCP installer, sandbox, package mirror or malware scan. No dynamic skill or MCP dispatch exists in the app. Every future broker must invoke the gate before executing any reviewed artifact. Do not represent external components as approved.
- Registry modifications require separate accountable human review, protected branch, release gate and signed approval evidence. Code checks alone cannot prevent a privileged repository writer from editing the gate and its policy together.
- Remaining: actual corporate mirror, malware scanning, full secret scanner/history scan, signed registry/approval, independent runtime trust enforcement, actual provider identity/retention verification, full GC-05 and atomic persistence. Keep draft; no production deploy.
