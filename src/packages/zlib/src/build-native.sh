#!/usr/bin/env bash
set -ev

export AR="zig ar"
export CC="zig cc -target native-native-gnu.2.28"
export CXX="zig c++ -target native-native-gnu.2.28"
#export CC="zig cc -target native-native-musl"
#export CXX="zig c++ -target native-native-musl"

./configure --prefix="$PREFIX"

make install -j8

cd "$PREFIX"
