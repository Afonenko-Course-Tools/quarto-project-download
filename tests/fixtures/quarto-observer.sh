#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$DOWNLOAD_COST_LOG"
exec "$DOWNLOAD_REAL_QUARTO" "$@"
