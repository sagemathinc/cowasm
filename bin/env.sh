#!/usr/bin/env bash
PACKAGES=`pwd`/packages
export PATH=`pwd`/bin:"$PACKAGES"/zig/dist:"$PACKAGES"/cpython/dist/native/bin:$PATH
