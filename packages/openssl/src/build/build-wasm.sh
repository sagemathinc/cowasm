#!/usr/bin/env bash
set -ev

cd $BUILD/openssl.wasm

CC=cc ./configure --prefix="$PREFIX"

make -j8

make install
