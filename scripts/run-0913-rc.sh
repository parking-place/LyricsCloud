#!/usr/bin/env bash
set -euo pipefail

pnpm migrate
pnpm migrate
pnpm check
pnpm test
pnpm build
pnpm test:release:0905
pnpm test:freeze:0911
pnpm test:security:0912
pnpm test:release:0913
pnpm test:performance:0913
pnpm test:release:0914
pnpm test:observability:0914

if [[ "${LC_RC_BROWSER:-0}" == "1" ]]; then
  pnpm test:e2e
  pnpm test:e2e:release:0905
fi
