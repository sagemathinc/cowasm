#!/usr/bin/env bash
PACKAGES=`pwd`/packages

# You have to run this via "source bin/env.sh" from the top level. It adds to your PATH:
# - The scripts in this bin directory
# - zig
# - some scripts in python-wasm; in particular, the super useful wabt tools such as wasm-objdump and wasm-strip.

export PATH=`pwd`/bin:$PATH
