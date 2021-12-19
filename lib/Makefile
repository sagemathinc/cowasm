# NOTE a test for sparse-matrix fails with ReleaseFast due to something
# weird involving random number generation.
OPT           = -O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/../packages/zig/dist:$(PATH)

ZIG_PKG       = --main-pkg-path ${CWD}/src
PACKAGES      = ${CWD}/../packages

GMP_NATIVE        = ${PACKAGES}/gmp/dist/native
GMP_WASM          = ${PACKAGES}/gmp/dist/wasm
GMP_NATIVE_CFLAGS = -L${GMP_NATIVE}/lib -I${GMP_NATIVE}/include -lgmp
GMP_WASM_CFLAGS   = -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a

MPFR_NATIVE        = ${PACKAGES}/mpfr/dist/native
MPFR_WASM          = ${PACKAGES}/mpfr/dist/wasm
MPFR_NATIVE_CFLAGS = -L${MPFR_NATIVE}/lib -I${MPFR_NATIVE}/include -lmpfr
MPFR_WASM_CFLAGS   = -L${MPFR_WASM}/lib -I${MPFR_WASM}/include ${MPFR_WASM}/lib/libmpfr.a

FLINT_NATIVE        = ${PACKAGES}/flint/dist/native
FLINT_WASM          = ${PACKAGES}/flint/dist/wasm
FLINT_NATIVE_CFLAGS = -L${FLINT_NATIVE}/lib -I${FLINT_NATIVE}/include/flint -lflint
FLINT_WASM_CFLAGS   = -L${FLINT_WASM}/lib -I${FLINT_WASM}/include/flint ${FLINT_WASM}/lib/libflint.a

PARI_NATIVE        = ${PACKAGES}/pari/dist/native
PARI_WASM          = ${PACKAGES}/pari/dist/wasm
PARI_NATIVE_CFLAGS = -L${PARI_NATIVE}/lib -I${PARI_NATIVE}/include -lpari
PARI_WASM_CFLAGS   = -L${PARI_WASM}/lib -I${CWD}/src/pari ${PARI_WASM}/lib/libpari.a

PYTHON_NATIVE = ${PACKAGES}/python/dist/native
PYTHON_WASM   = ${PACKAGES}/python/dist/wasm
### (was below in NATIVE_CFLAGS) -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9 -lpython3.9

WASM_CFLAGS   = -dynamic ${OPT}

NATIVE_CFLAGS_NOOPT = -I. ${PARI_NATIVE_CFLAGS}  ${GMP_NATIVE_CFLAGS}  ${FLINT_NATIVE_CFLAGS} ${MPFR_NATIVE_CFLAGS} -lc
NATIVE_CFLAGS = ${NATIVE_CFLAGS_NOOPT} ${OPT}

TEST = ./zig-test.sh ${NATIVE_CFLAGS_NOOPT} -I${CWD}/src/pari 

DIST = ${CWD}/dist

.PHONY: all
all: ${DIST}/.built

## Interface with FLINT
.PHONY: test-flint-nmod-mat
test-flint-nmod-mat:
	cd src && ${TEST} flint/nmod-mat.zig

${DIST}/flint.wasm: src/flint/nmod-mat.zig
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc \
	  ${GMP_WASM_CFLAGS} ${FLINT_WASM_CFLAGS} ${MPFR_WASM_CFLAGS} \
	    ${WASM_CFLAGS} flint/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/interface.wasm ${DIST}/flint.wasm

## Interface with GMP directly:
.PHONY: test-integer
test-integer:
	cd src && ${TEST} integer/integer.zig

.PHONY: test-rational
test-rational:
	cd src && ${TEST} rational/rational.zig

${DIST}/gmp.wasm: src/rational/rational.zig src/rational/interface.zig src/custom-allocator.zig src/integer/integer.zig src/integer/interface.zig  src/interface/gmp.zig src/interface/proxy.zig
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a ${WASM_CFLAGS} interface/gmp.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/gmp.wasm ${DIST}/

## New low-level code from scratch written in Zig

${DIST}/arith.wasm: src/arith.zig src/arith-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} arith-export.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/arith-export.wasm ${DIST}/arith.wasm

.PHONY: test-generic-power
test-generic-power:
	cd src && ./zig-test.sh arith/generic-power.zig -lgmp -lc -I${GMP_NATIVE}/include -L${GMP_NATIVE}/lib


${DIST}/factor.wasm: src/factor.zig src/factor-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} factor-export.zig  ${ZIG_PKG}
	mkdir -p ${DIST}
	mv src/factor-export.wasm ${DIST}/factor.wasm

${DIST}/complex/complex.wasm: src/complex/complex.zig
	cd src/complex && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} complex.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/complex
	mv src/complex/complex.wasm ${DIST}/complex/complex.wasm

${DIST}/modular/p1list.wasm: src/modular/p1list.zig src/modular/p1list-export.zig src/interface/proxy.zig src/interface.zig src/interface/util.zig src/modular/sl2z.zig
	cd src/ && zig build-lib -target wasm32-wasi ${WASM_CFLAGS} ${FLINT_WASM_CFLAGS} modular/p1list-export.zig  ${ZIG_PKG} -lc
	mkdir -p ${DIST}/modular
	mv src/p1list-export.wasm ${DIST}/modular/p1list.wasm


${DIST}/modular/manin-symbols.wasm: src/modular/manin-symbols.zig src/modular/interface.zig src/interface/proxy.zig src/interface.zig src/interface/util.zig src/modular/dense-vector-interface.zig src/modular/dense-matrix.zig src/modular/dense-matrix-interface.zig src/pari/pari.h src/pari/pari.zig
	cd src/ && zig build-lib -target wasm32-wasi ${WASM_CFLAGS} ${FLINT_WASM_CFLAGS} ${GMP_WASM_CFLAGS} ${MPFR_WASM_CFLAGS}  ${PARI_WASM_CFLAGS}  modular/interface.zig  ${ZIG_PKG} -lc
	mkdir -p ${DIST}/modular
	mv src/interface.wasm ${DIST}/modular/manin-symbols.wasm

.PHONY: test-manin-symbols
test-manin-symbols:
	cd src && ${TEST} modular/manin-symbols.zig

.PHONY: test-dense-matrix
test-dense-matrix:
	cd src && ${TEST} modular/dense-matrix.zig

.PHONY: test-p1list
test-p1list:
	cd src && ${TEST} modular/p1list.zig

.PHONY: test-heilbronn
test-heilbronn:
	cd src && ${TEST} modular/heilbronn.zig

.PHONY: test-modular
test-modular:
	cd src && grep -l test modular/*.zig | grep -v interface |grep -v export | xargs -t -n 1 ${TEST}


${DIST}/modular/dims.wasm: src/modular/dims.zig src/trial-division.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} modular/dims.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/modular
	mv src/dims.wasm ${DIST}/modular/

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

# native m1 mac development -- test what works (e.g., Python doesn't, and maybe we don't need it)
.PHONY: test-macos
test-macos:
	cd src && grep -l test *.zig */*.zig | grep -v interface |grep -v export | grep -v python | grep -v pari | xargs -t -n 1 ${TEST}

####################
## PARI interface
####################

test-pari:
	cd src && ${TEST} pari/pari.zig -I.

${DIST}/pari/pari.wasm: src/pari/pari.zig src/pari/interface.zig src/pari/pari.h
	cd src && zig build-lib -target wasm32-wasi -lc  ${PARI_WASM_CFLAGS} ${GMP_WASM_CFLAGS} ${WASM_CFLAGS} pari/interface.zig  ${ZIG_PKG}
	mkdir -p ${DIST}/pari
	mv src/interface.wasm ${DIST}/pari/pari.wasm

####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9  -lpython3.9 -lc  #-O ReleaseFast

${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig
	cd src && zig build-lib -dynamic -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.9 ${PYTHON_WASM}/lib/libpython3.9.a ${WASM_CFLAGS} python/interface.zig  ${ZIG_PKG}
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

# ${DIST}/python/python.wasm

${DIST}/.built: node_modules ${DIST}/factor.wasm ${DIST}/complex/complex.wasm ${DIST}/gmp.wasm ${DIST}/arith.wasm ${DIST}/modular/p1list.wasm ${DIST}/modular/manin-symbols.wasm ${DIST}/modular/dims.wasm ${DIST}/pari/pari.wasm
	npx tsc
	touch ${DIST}/.built

# Run all test suites...
.PHONY: test
test: test-zig
	npm run test

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache