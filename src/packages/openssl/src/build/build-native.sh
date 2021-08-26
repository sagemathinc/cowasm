#!/usr/bin/env bash
set -ev
cd $BUILD/openssl.native

CC=cc ./Configure --prefix="$PREFIX"

make

make install
