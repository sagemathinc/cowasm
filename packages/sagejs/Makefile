CFLAGS = -dynamic -O ReleaseFast

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
GMP_NATIVE = ${CWD}/../gmp/dist/native
GMP_WASM = ${CWD}/../gmp/dist/wasm
PARI_NATIVE = ${CWD}/../pari/dist/native
PARI_WASM = ${CWD}/../pari/dist/wasm
PYTHON_NATIVE = ${CWD}/../python/dist/native
PYTHON_WASM = ${CWD}/../python/dist/wasm

DIST = ${CWD}/dist

all: ${DIST}/.built

node_modules:
	npm ci


## Interface with GMP directly:

${DIST}/integer.js: src/integer.ts node_modules
	npx tsc

integer-test:
	cd src && zig test integer.zig -lgmp -lc -I${GMP_NATIVE}/include -L${GMP_NATIVE}/lib

${DIST}/integer.wasm: src/integer.zig src/integer-export.zig src/custom-allocator.zig
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a ${CFLAGS} integer-export.zig
	mkdir -p ${DIST}
	mv src/integer-export.wasm ${DIST}/integer.wasm


## New low-level code from scratch

${DIST}/arith.wasm: src/arith.zig src/arith-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${CFLAGS} arith-export.zig
	mkdir -p ${DIST}
	mv src/arith-export.wasm ${DIST}/arith.wasm

${DIST}/arith.js: src/arith.ts node_modules
	npx tsc

${DIST}/factor.wasm: src/factor.zig src/factor-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${CFLAGS} factor-export.zig
	mkdir -p ${DIST}
	mv src/factor-export.wasm ${DIST}/factor.wasm

${DIST}/factor.js: src/factor.ts node_modules
	npx tsc

${DIST}/p1list.wasm: src/p1list.zig src/p1list-export.zig src/p1list-container.zig
	cd src/ && zig build-lib -target wasm32-wasi ${CFLAGS} p1list-export.zig
	mkdir -p ${DIST}
	mv src/p1list-export.wasm ${DIST}/p1list.wasm


####################
## PARI
####################

${DIST}/pari.js: src/pari/pari.ts node_modules
	npx tsc

pari-test:
	cd src/pari && zig test pari.zig -I. -L${PARI_NATIVE}/lib -L${GMP_NATIVE}/lib -I${PARI_NATIVE}/include -I${GMP_NATIVE}/include -lpari -lgmp -lc  #-O ReleaseFast

${DIST}/pari.wasm: src/pari/pari.zig src/pari/interface.zig src/pari/pari.h
	cd src/pari && zig build-lib -target wasm32-wasi -lc -I. -I${GMP_WASM}/include ${GMP_WASM}/lib/libgmp.a -I${PARI_WASM}/include ${PARI_WASM}/lib/libpari.a ${CFLAGS} interface.zig
	mkdir -p ${DIST}/pari
	mv src/pari/interface.wasm ${DIST}/pari.wasm

####################
## Python
####################
####################

${DIST}/python.js: src/python/python.ts node_modules
	npx tsc

python-test:
	cd src/python && zig test python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9 -lpython3.9 -lc  #-O ReleaseFast

${DIST}/python.wasm: src/python/python.zig src/python/interface.zig src/python/python.h
	cd src/python && zig build-lib -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.9 ${PYTHON_WASM}/lib/libpython3.9.a ${CFLAGS} python.zig
	mkdir -p ${DIST}/python
	mv src/python/python.wasm ${DIST}/python.wasm


## Put it all together

${DIST}/.built: ${DIST}/integer.wasm ${DIST}/integer.js ${DIST}/arith.wasm ${DIST}/arith.js ${DIST}/p1list.wasm ${DIST}/pari.wasm ${DIST}/python.wasm
	touch ${DIST}/.built

.PHONY: all
all: ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo