OPT           = -O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PACKAGES      = ${CWD}/..
export PATH := ${PACKAGES}/../bin:${PACKAGES}/zig/dist:$(PATH)

ZIG_PKG       = --main-pkg-path ${CWD}/src

PYTHON_NATIVE = ${PACKAGES}/cpython/dist/native
PYTHON_WASM   = ${PACKAGES}/cpython/dist/wasm
POSIX_WASM   = ${PACKAGES}/wasm-posix/dist/

WASM_CFLAGS   = -dynamic ${OPT}

TEST = ./test-zig.sh

DIST = ${CWD}/dist

.PHONY: all
all: ${DIST}/.built

# Runs zig test on all zig files that contain the word "test" but do not
# have interface or export in their filename (since can't test those).
.PHONY: test-zig
test-zig:
	cd src && grep -l test *.zig */*.zig | grep -v interface | grep -v export | xargs -t -n 1 ${TEST}

####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.11  -lpython3.11 -lc   ${OPT}

${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig
	cd src && zig build-lib -dynamic -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM} ${PYTHON_WASM}/lib/libpython3.11.a ${POSIX_WASM}/libwasmposix.a  ${PACKAGES}/libedit/dist/wasm/lib/libedit.a  ${PACKAGES}/termcap/dist/wasm/lib/libtermcap.a ${WASM_CFLAGS} python/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm
	cp ${PYTHON_WASM}/lib/dist/python311.zip ${DIST}/python/python.zip

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
test: all test-zig
	npm run test

# Run the benchmark suite that's in the jpython package.
.PHONE: bench
bench:
	echo "STARTING python-wasm benchmark suite"
	../../bin/python-wasm `pwd`/../jpython/bench/all.py
	echo "FINISHED python-wasm benchmark suite"

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache
