OPT           = -O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/../packages/zig/dist:$(PATH)

ZIG_PKG       = --main-pkg-path ${CWD}/src
PACKAGES      = ${CWD}/../packages

PYTHON_NATIVE = ${PACKAGES}/cpython/dist/native
PYTHON_WASM   = ${PACKAGES}/cpython/dist/wasm
### (was below in NATIVE_CFLAGS) -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.11 -lpython3.11

POSIX_WASM   = ${PACKAGES}/wasm-posix/dist/

WASM_CFLAGS   = -dynamic ${OPT}

NATIVE_CFLAGS_NOOPT = -I. -lc
NATIVE_CFLAGS = ${NATIVE_CFLAGS_NOOPT} ${OPT}

TEST = ./zig-test.sh ${NATIVE_CFLAGS_NOOPT}

DIST = ${CWD}/dist

.PHONY: all
all: ${DIST}/.built

# Runs zig test on all zig files that contain the word "test" but do not
# have interface or export in their filename (since can't test those).
# Runs on each one individually, not all at once which doesn't work.
# not in parallel
.PHONY: test-zig1
test-zig1:
	cd src && grep -l test *.zig */*.zig | grep -v interface |grep -v export | xargs -t -n 1 ${TEST}

# in parallel
.PHONY: test-zig
test-zig:
	cd src && grep -l test *.zig */*.zig | grep -v interface |grep -v export | xargs -t -P 8 -n 1 ${TEST}


####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.11  -lpython3.11 -lc  #-O ReleaseFast

${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig
	cd src && zig build-lib -dynamic -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM} ${PYTHON_WASM}/lib/libpython3.11.a ${POSIX_WASM}/libwasmposix.a ${WASM_CFLAGS} python/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm

.PHONEY: python
python: ${DIST}/python/python.wasm

##################
## Interface support functionality for WebAssembly.
##   - Proxy Objects
##################

test-proxy:
	cd src && ${TEST} interface/proxy.zig

## Node modules
node_modules:
	npm ci

## Put it all together

${DIST}/.built: node_modules ${DIST}/python/python.wasm
	npx tsc
	touch ${DIST}/.built

# Run all test suites: (1) the Native zig test suite; (2) the Javascript test suite.
# This exercise zig-related code both via a native build, and then via the separate WebAssembly build.
.PHONY: test
test: test-zig
	npm run test

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache
