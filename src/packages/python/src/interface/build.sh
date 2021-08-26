#!/usr/bin/env bash
set -ev

export PREFIX=`pwd`/../../build/local/

emcc interface.c  -o interface.js \
    -I $PREFIX/include/python3.9 -L $PREFIX/lib/ \
    -lpython3.9 -ldl  -lm \
    -s MODULARIZE=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s EXPORTED_FUNCTIONS='["_init", "_py_run", "_py_eval", "_py_mul", "_py_repr", "_py_str", "_py_tmp_string_free", "_finalize"]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
    --preload-file $PREFIX/lib/python3.9
