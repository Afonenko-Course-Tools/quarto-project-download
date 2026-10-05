#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
quarto=${QUARTO:-quarto}
: "${CORE:?Set CORE to the current native Core checkout}"
cd "$repo"
for test in archive render ownership native native-installed; do
  "$quarto" run "tests/$test.ts"
done
