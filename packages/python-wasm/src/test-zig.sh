#!/usr/bin/env bash

export SRC="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PACKAGES="$SRC"/../..
export PYTHON_NATIVE="$PACKAGES"/cpython/dist/native
export DYLD_LIBRARY_PATH="$PYTHON_NATIVE/lib"
export LD_LIBRARY_PATH="$PYTHON_NATIVE/lib"
export ZIG_SYSTEM_LINKER_HACK=1

set -e
zig test -I. -I"$PYTHON_NATIVE/include/python3.11" -L"$PYTHON_NATIVE/lib" -lpython3.11 -lc  --main-pkg-path "$SRC" `pwd`/$1
