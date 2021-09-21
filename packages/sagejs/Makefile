OPT           = #-O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

GMP_NATIVE    = ${CWD}/../gmp/dist/native
GMP_WASM      = ${CWD}/../gmp/dist/wasm

PARI_NATIVE   = ${CWD}/../pari/dist/native
PARI_WASM     = ${CWD}/../pari/dist/wasm

PYTHON_NATIVE = ${CWD}/../python/dist/native
PYTHON_WASM   = ${CWD}/../python/dist/wasm

WASM_CFLAGS   = -dynamic ${OPT}
NATIVE_CFLAGS = -I. -L${PARI_NATIVE}/lib -I${PARI_NATIVE}/include -lpari   -L${GMP_NATIVE}/lib -I${GMP_NATIVE}/include -lgmp -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include -lpython3.9  -lc ${OPT}

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
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a ${WASM_CFLAGS} integer-export.zig
	mkdir -p ${DIST}
	mv src/integer-export.wasm ${DIST}/integer.wasm


## New low-level code from scratch written in Zig

${DIST}/arith.wasm: src/arith.zig src/arith-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} arith-export.zig
	mkdir -p ${DIST}
	mv src/arith-export.wasm ${DIST}/arith.wasm

${DIST}/arith.js: src/arith.ts node_modules
	npx tsc

${DIST}/factor.wasm: src/factor.zig src/factor-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${WASM_CFLAGS} factor-export.zig
	mkdir -p ${DIST}
	mv src/factor-export.wasm ${DIST}/factor.wasm

${DIST}/factor.js: src/factor.ts node_modules
	npx tsc

${DIST}/p1list.wasm: src/p1list.zig src/p1list-export.zig src/p1list-container.zig
	cd src/ && zig build-lib -target wasm32-wasi ${WASM_CFLAGS} p1list-export.zig
	mkdir -p ${DIST}
	mv src/p1list-export.wasm ${DIST}/p1list.wasm

# Runs zig test on all zig files that contain the word "test" but do not
# have interface or export in their filename (since can't test those).
# Runs on each one individually, not all at once which doesn't work.
zig-test:
	cd src && \
		grep -l test *.zig */*.zig | grep -v interface |grep -v export | xargs -P 8  -t -n 1 zig test --main-pkg-path ${CWD} ${NATIVE_CFLAGS}

####################
## PARI interface
####################

${DIST}/pari.js: src/pari/pari.ts node_modules
	npx tsc

pari-test:
	cd src/pari && zig test pari.zig -I. ${NATIVE_CFLAGS}

${DIST}/pari.wasm: src/pari/pari.zig src/pari/interface.zig src/pari/pari.h
	cd src/pari && zig build-lib -target wasm32-wasi -lc -I. -I${GMP_WASM}/include ${GMP_WASM}/lib/libgmp.a -I${PARI_WASM}/include ${PARI_WASM}/lib/libpari.a ${WASM_CFLAGS} interface.zig
	mkdir -p ${DIST}/pari
	mv src/pari/interface.wasm ${DIST}/pari.wasm

####################
## Python interface
####################

${DIST}/python.js: src/python/python.ts node_modules
	npx tsc

python-test:
	cd src/python && zig test python.zig -I. -L${PYTHON_NATIVE}/lib -I${PYTHON_NATIVE}/include/python3.9 -lpython3.9 -lc  #-O ReleaseFast

${DIST}/python.wasm: src/python/python.zig src/python/interface.zig
	cd src/python && zig build-lib -dynamic -target wasm32-wasi -lc -I. -I${PYTHON_WASM}/include/python3.9 ${PYTHON_WASM}/lib/libpython3.9.a ${WASM_CFLAGS} interface.zig
	mkdir -p ${DIST}/python
	mv src/python/interface.wasm ${DIST}/python.wasm

${DIST}/xpython.wasm: src/python/python.c
	cd src/python && zig cc -target wasm32-wasi python.c -o python.wasm \
	                 -Wl,--no-entry -Wl,--export-all \
		             -I${PYTHON_WASM}/include/python3.9 ${PYTHON_WASM}/lib/libpython3.9.a
	mkdir -p ${DIST}/python
	mv src/python/python.wasm ${DIST}/python.wasm

## Put it all together

${DIST}/.built: ${DIST}/integer.wasm ${DIST}/integer.js ${DIST}/arith.wasm ${DIST}/arith.js ${DIST}/p1list.wasm ${DIST}/pari.wasm ${DIST}/python.wasm
	touch ${DIST}/.built

.PHONY: all
all: ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo