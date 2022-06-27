#!/usr/bin/env bash
#set -ev

export SRC="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PACKAGES="$SRC"/../../packages
export GMP_NATIVE="$PACKAGES"/gmp/dist/native
export PARI_NATIVE="$PACKAGES"/pari/dist/native
export MPFR_NATIVE="$PACKAGES"/mpfr/dist/native

export DYLD_LIBRARY_PATH="$GMP_NATIVE/lib":"$PARI_NATIVE/lib":"$MPFR_NATIVE/lib"
export LD_LIBRARY_PATH="$GMP_NATIVE/lib":"$PARI_NATIVE/lib":"$MPFR_NATIVE/lib"
export ZIG_SYSTEM_LINKER_HACK=1

#echo $DYLD_LIBRARY_PATH
#echo $@
zig test --main-pkg-path "$SRC" $@
