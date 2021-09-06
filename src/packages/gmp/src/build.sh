#!/usr/bin/env bash
set -ev

. "$INIT_CWD"/src/build-env.sh

rm -rf "$BUILD"
mkdir "$BUILD"
export PATH0=$PATH

export PREFIX="$DIST"/native
export PATH=`pwd`/../../bin/native:$PATH0
"$INIT_CWD"/src/build-native.sh

rm -rf "$BUILD"
mkdir "$BUILD"

export PREFIX="$DIST"/wasm
export PATH=`pwd`/../../bin/wasm:$PATH0
"$INIT_CWD"/src/build-wasm.sh
