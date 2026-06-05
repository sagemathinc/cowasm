# Baseline Build

This document records the current known-good CoWasm build path.  It is intentionally narrower than the full historical `make test` target: the goal is to preserve a reproducible green baseline before upgrading Zig, Python, or package versions.

Last verified locally: 2026-06-05 on Ubuntu with Node 26.

## Apt Dependencies

On an apt-based Linux system, install:

```sh
sudo apt-get update
sudo apt-get install -y \
  autoconf \
  automake \
  ca-certificates \
  cmake \
  curl \
  diffutils \
  dpkg-dev \
  git \
  libncurses-dev \
  libtool \
  m4 \
  make \
  patch \
  pkg-config \
  python-is-python3 \
  tcl \
  texinfo \
  xz-utils \
  yasm \
  zip
```

Install `pnpm` if it is not already available:

```sh
npm install -g pnpm
```

## Known-Good Commands

Run from the repository root:

```sh
make audit-sources
make fetch-sources
make -C core/build zig
make -C core/zlib test
make -C core/kernel test
make -C python/cpython pip
make -C python/cpython test-runtime-contracts
make -C python/cpython test
```

Expected CPython result:

```text
== Tests result: SUCCESS ==
All 279 tests OK.
```

## Current Scope

This baseline verifies:

- active upstream source URLs and checksums;
- pinned Zig `0.10.1` bootstrap;
- the core CoWasm kernel runner and basic POSIX tests;
- zlib as a small package-level sanity check;
- CPython `3.11.2` for WASM;
- Python `pip`/`ensurepip`;
- focused Python runtime contracts for subprocess, pipes, spawn, and exit status;
- the supported CPython test subset.

This baseline does not claim that every package in the repo builds or tests successfully.  `core/dash-wasm` is now separately verified, but it is intentionally outside the conservative baseline CI until the broader terminal bundle dependencies are better documented.

## Useful Smoke Tests

After the baseline build succeeds, these quick commands exercise the generated binaries:

```sh
./bin/cowasm core/kernel/build/test/hello.wasm
./bin/python-wasm -c "import sys, ssl, sqlite3, zlib, lzma, bz2, readline; print(sys.version); print(ssl.OPENSSL_VERSION)"
./bin/python-wasm -c "import os, sys; raise SystemExit(os.spawnl(os.P_WAIT, sys.executable, sys.executable, '-c', 'print(123)'))"
```
