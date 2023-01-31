#!/usr/bin/env bash

export SRC="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

export ZIG_SYSTEM_LINKER_HACK=1
export TEST_CMD="$SRC"/../node_modules/.bin/wasi-run

export TARGET="$1"
shift

echo zig test -target wasm32-wasi --test-cmd "$TEST_CMD" --test-cmd-bin  -I. -I"$POSIX_WASM" -lc  --main-pkg-path "$SRC" `pwd`/$TARGET "$@"
zig test -target wasm32-wasi --test-cmd "$TEST_CMD" --test-cmd-bin  -I. -I"$POSIX_WASM" -lc --main-pkg-path "$SRC" `pwd`/$TARGET "$@"
