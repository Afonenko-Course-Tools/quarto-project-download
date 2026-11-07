#!/bin/sh
[ "$DOWNLOAD_ENV_SENTINEL" = inherited ] || exit 92
[ "$COURSE_PERF_PARENT_SPAN_ID" = original-ghost ] || exit 93
printf '%s\n' "$1" >> "$DOWNLOAD_ENV_LOG"
exec "$DOWNLOAD_REAL_GIT" "$@"
