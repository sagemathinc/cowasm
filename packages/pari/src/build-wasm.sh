#!/usr/bin/env bash
set -ev

export CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL "
export CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL "
export LDFLAGS="-lwasi-emulated-mman -lwasi-emulated-signal -lc "
export AR="zig ar"
export RANLIB="zig ranlib"

./Configure --graphic=none --host=wasm-emscripten --prefix="$PREFIX" 

cd O*

# We set AR="zig ar", since PARI's configure doesn't properly recognize the AR env
# variable, i.e., exactly the problem discussed here: https://emscripten.org/docs/compiling/Building-Projects.html
make AR="zig ar" RANLIB="zig ranlib" -j8

make AR="zig ar" RANLIB="zig ranlib" install

