#!/usr/bin/env bash
set -ev

. "$INIT_CWD"/src/build/build-env.sh

rm -rf "$BUILD"
mkdir "$BUILD"
. "$INIT_CWD"/src/build/download.sh

export PATH0=$PATH
export PREFIX="$DIST".native
export PATH=`pwd`/../../bin.native:$PATH0
time "$INIT_CWD"/src/build/build-native.sh


# Include our new native Python in path
export PATH=`pwd`/../../bin.wasm:$PREFIX.native/bin:$PATH0
export PREFIX="$DIST".wasm
time "$INIT_CWD"/src/build/build-wasm.sh
