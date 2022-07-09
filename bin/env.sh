#!/usr/bin/env bash
# See https://stackoverflow.com/questions/242538/unix-shell-script-find-out-which-directory-the-script-file-resides
SCRIPTPATH=`pwd`/"$(dirname "$BASH_SOURCE")"
PACKAGES="$SCRIPTPATH"/../packages
export PATH="$SCRIPTPATH":"$PACKAGES"/zig/dist:"$PACKAGES"/cpython/dist/native/bin:$PATH