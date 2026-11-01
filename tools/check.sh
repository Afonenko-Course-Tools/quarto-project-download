#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
quarto=${QUARTO:-quarto}
: "${CORE:?Set CORE to the current native Core checkout}"
: "${QRC:?Set QRC to the current QRC checkout}"
cd "$repo"
# Каждый настоящий public suite выполняется один раз: runtime-batch default — его alias.
for test in request-contract literal-request literal-request-native native-carriers native-phase native-buffer contract-consistency performance-context diagnostics archive model-artifacts package-once public-inventory public-runtime model-receipts render ownership; do
  "$quarto" run "tests/$test.ts"
done
"$quarto" run tests/runtime-batch.ts no-core-ordinary
