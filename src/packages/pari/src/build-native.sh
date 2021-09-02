#!/usr/bin/env bash
set -ev

export AR="zig ar"
export CC="zig cc -target native-native-gnu.2.28"
export RANLIB="zig ranlib"

./Configure --prefix="$PREFIX" --graphic=none

cd O*

# We set AR="zig ar", since PARI's configure doesn't properly recognize the AR env
# variable, i.e., exactly the problem discussed here: https://emscripten.org/docs/compiling/Building-Projects.html
make AR="zig ar" RANLIB="zig ranlib" -j8

make AR="zig ar" RANLIB="zig ranlib" install

