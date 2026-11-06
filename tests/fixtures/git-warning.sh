#!/bin/sh
if [ "$1" = init ]; then exit 0; fi
cat >/dev/null
printf 'WARNING_ALLOWED\n' >&2
exit 1
