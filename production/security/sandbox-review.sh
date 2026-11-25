#!/usr/bin/env bash
# Local developer-owned, credential-free sandbox for dependency-free test scripts only.
# Obtain and approve the immutable image separately. This does not install endpoint EDR.
set -euo pipefail
image="${GAP_APPROVED_TEST_IMAGE:-}"
if [[ ! "$image" =~ ^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$ ]]; then
  echo "Denied: an independently approved digest-pinned Node image is required" >&2; exit 2
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
docker image inspect "$image" >/dev/null
docker run --rm --pull=never --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=512m --cpus=1 --user=65534:65534 --tmpfs /tmp:rw,noexec,nosuid,size=64m --mount "type=bind,source=$root,target=/work,readonly" --workdir=/work --env HOME=/tmp --entrypoint node "$image" --experimental-strip-types --test tests/agent-foundation.test.mjs tests/execution-reservation.test.mjs tests/provider-control.test.mjs tests/review-orchestrator.test.mjs tests/security-defense.test.mjs
