#!/usr/bin/env bash
set -ev

export SRC="$INIT_CWD"/src

export CC="zig cc -target wasm32-wasi-musl"
export CXX="zig c++ -target wasm32-wasi-musl"
export AR="zig ar"

./configure --prefix=$PREFIX

make install