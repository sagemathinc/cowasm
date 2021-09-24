OPT           = #-O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

ZIG_PKG       = --main-pkg-path ${CWD}/src
PACKAGES      = ${CWD}/../packages
GMP_NATIVE    = ${PACKAGES}/gmp/dist/native
GMP_WASM      = ${PACKAGES}/gmp/dist/wasm

PARI_NATIVE   = ${PACKAGES}/pari/dist/native
PARI_WASM     = ${PACKAGES}/pari/dist/wasm

PYTHON_NATIVE = ${PACKAGES}/python/dist/native
PYTHON_WASM   = ${PACKAGES}/python/dist/wasm

WASM_CFLAGS   = -dynamic ${OPT}
NATIVE_CFLAGS = -I. -L${PARI_NATIVE}/lib -I${PARI_NATIVE}/include -lpari   -L${GMP_NATIVE}/lib -I${GMP_NATIVE}/include -lgmp -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9 -lpython3.9  -lc ${OPT}

DIST = ${CWD}/dist

.PHONY: all
all: ${DIST}/.built

## Interface with GMP directly:
.PHONY: test-integer
test-integer:
	cd src && zig test integer/integer.zig -lgmp -lc -I${GMP_NATIVE}/include -L${GMP_NATIVE}/lib ${ZIG_PKG}

${DIST}/integer/integer.wasm: src/integer/integer.zig src/integer/interface.zig src/custom-allocator.zig
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a ${WASM_CFLAGS} integer/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/interface.wasm ${DIST}/integer/integer.wasm


## New low-level code from scratch written in Zig

${DIST}/arith.wasm: src/arith.zig src/arith-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} arith-export.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/arith-export.wasm ${DIST}/arith.wasm


${DIST}/factor.wasm: src/factor.zig src/factor-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} factor-export.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/factor-export.wasm ${DIST}/factor.wasm



${DIST}/modular/p1list.wasm: src/modular/p1list.zig src/modular/p1list-export.zig src/modular/p1list-container.zig src/modular/sl2z.zig
	cd src/ && zig build-lib -target wasm32-wasi ${WASM_CFLAGS} modular/p1list-export.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/modular
	mv src/p1list-export.wasm ${DIST}/modular/p1list.wasm

# Runs zig test on all zig files that contain the word "test" but do not
# have interface or export in their filename (since can't test those).
# Runs on each one individually, not all at once which doesn't work.
# not in parallel
.PHONY: test-zig1
test-zig1:
	cd src && grep -l test *.zig */*.zig | grep -v interface |grep -v export | xargs -t -n 1 zig test ${ZIG_PKG} ${NATIVE_CFLAGS}
# in parallel
.PHONY: test-zig
test-zig:
	cd src && grep -l test *.zig */*.zig | grep -v interface |grep -v export | xargs -t -P 8 -n 1 zig test ${ZIG_PKG} ${NATIVE_CFLAGS}

####################
## PARI interface
####################

test-pari:
	cd src && zig test pari/pari.zig -I. ${NATIVE_CFLAGS}  ${ZIG_PKG}

${DIST}/pari/pari.wasm: src/pari/pari.zig src/pari/interface.zig src/pari/pari.h
	cd src && zig build-lib -target wasm32-wasi -lc -I. -I${GMP_WASM}/include ${GMP_WASM}/lib/libgmp.a -I${PARI_WASM}/include ${PARI_WASM}/lib/libpari.a ${WASM_CFLAGS} pari/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/pari
	mv src/interface.wasm ${DIST}/pari/pari.wasm

####################
## Python interface
####################

test-python:
	cd src && zig test python/python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9  ${ZIG_PKG} -lpython3.9 -lc  #-O ReleaseFast

${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig
	cd src && zig build-lib -dynamic -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.9 ${PYTHON_WASM}/lib/libpython3.9.a ${WASM_CFLAGS} python/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm

## Put it all together

${DIST}/.built: ${DIST}/integer/integer.wasm ${DIST}/arith.wasm ${DIST}/modular/p1list.wasm ${DIST}/pari/pari.wasm ${DIST}/python/python.wasm
	npm ci
	npx tsc
	touch ${DIST}/.built

# Run all test suites...
.PHONY: test
test: test-zig
	npm run test

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache