#!/bin/sh

set -ev
make -j8
rm libdash.a
zig ar -crs libdash.a src/*.o src/*/*.o
cp ./libdash.a ../../dist/wasm/lib