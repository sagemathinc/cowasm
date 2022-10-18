#!/bin/sh

set -ev
make -j8

cp src/dash ../../dist/wasm/bin/dash
