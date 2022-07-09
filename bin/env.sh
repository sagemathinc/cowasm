#!/usr/bin/env bash
PACKAGES=`pwd`/packages

export DYLD_LIBRARY_PATH="$PACKAGES"/cpython/dist/native/lib:"$PACKAGES"/zlib/dist/native/lib:$DYLD_LIBRARY_PATH
export LD_LIBRARY_PATH="$PACKAGES"/cpython/dist/native/lib:"$PACKAGES"/zlib/dist/native/lib:$LD_LIBRARY_PATH
export PATH=`pwd`/bin:"$PACKAGES"/zig/dist:"$PACKAGES"/cpython/dist/native/bin:$PATH
