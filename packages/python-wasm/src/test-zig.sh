#!/usr/bin/env bash

export SRC="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PACKAGES="$SRC"/../..
export PYTHON_WASM="$PACKAGES"/cpython/dist/wasm
export POSIX_WASM="$PACKAGES"/posix-wasm/dist/wasm
export ZIG_SYSTEM_LINKER_HACK=1
export TEST_CMD="$PACKAGES"/wasi/bin/run.js

echo "$POSIX_WASM"

export TARGET="$1"
shift

echo zig test -target wasm32-wasi --test-cmd "$TEST_CMD" --test-cmd-bin  -I. -I"$PYTHON_WASM/include/python3.11" -I"$POSIX_WASM" -L"$PYTHON_WASM/lib" -lpython3.11 -lc  --main-pkg-path "$SRC" `pwd`/$TARGET "$@"
zig test -target wasm32-wasi --test-cmd "$TEST_CMD" --test-cmd-bin  -I. -I"$PYTHON_WASM/include/python3.11" -I"$POSIX_WASM" -L"$PYTHON_WASM/lib" -lpython3.11 -lc  --main-pkg-path "$SRC" `pwd`/$TARGET "$@"
