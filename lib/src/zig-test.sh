#!/usr/bin/env bash
#set -ev

export SRC="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PACKAGES="$SRC"/../../packages
export PYTHON_NATIVE="$PACKAGES"/python/dist/native
export DYLD_LIBRARY_PATH="$PYTHON_NATIVE/lib"
export LD_LIBRARY_PATH="$PYTHON_NATIVE/lib"
export ZIG_SYSTEM_LINKER_HACK=1

#echo $DYLD_LIBRARY_PATH
#echo $@
zig test --main-pkg-path "$SRC" $@
