#!/bin/sh
if [ "$1" = init ]; then exit 0; fi
printf 'GIT_EARLY_STDOUT\n'
printf 'GIT_EARLY_STDERR\n' >&2
exit 19
