#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
quarto=${QUARTO:-quarto}
: "${CORE:?Set CORE to the current native Core checkout}"
cd "$repo"
for test in diagnostics archive model-artifacts render ownership native native-installed model-installed; do
  "$quarto" run "tests/$test.ts"
done

for mode in namespaced plain active; do
  "$quarto" run tests/install-context.ts "$mode"
done
