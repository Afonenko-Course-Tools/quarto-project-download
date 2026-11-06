#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
quarto=${QUARTO:-quarto}
: "${CORE:?Set CORE to the current native Core checkout}"
: "${QRC:?Set QRC to the current QRC checkout}"
cd "$repo"
"$quarto" run tools/check-types.ts
# Каждый настоящий public suite выполняется один раз: runtime-batch default — его alias.
for test in project-contract-consumer own-stage-progress request-contract resource-membership-native native-carriers native-phase native-buffer contract-consistency performance-context diagnostics archive ordinary-source-guards model-artifacts package-once package-bytes public-inventory public-runtime model-receipts render presentation ownership request-paths; do
  "$quarto" run "tests/$test.ts"
done
"$quarto" run tests/presentation.ts --gfm
"$quarto" run tests/runtime-batch.ts no-core-ordinary
