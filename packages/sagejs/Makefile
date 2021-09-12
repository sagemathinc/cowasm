CFLAGS = -dynamic -O ReleaseFast

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
GMP_NATIVE = ${CWD}/../gmp/dist/native
GMP_WASM = ${CWD}/../gmp/dist/wasm

DIST = ${CWD}/dist

all: ${DIST}/.built

node_modules:
	npm ci


${DIST}/integer.js: src/integer.ts node_modules
	npx tsc

test-integer:
	cd src && zig test integer.zig -lgmp -lc -I${GMP_NATIVE}/include -L${GMP_NATIVE}/lib

${DIST}/integer.wasm: src/integer.zig src/integer-export.zig src/custom-allocator.zig
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a ${CFLAGS} integer-export.zig
	mkdir -p ${DIST}
	mv src/integer-export.wasm ${DIST}/integer.wasm


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



${DIST}/p1list.wasm: src/p1list.zig src/p1list-export.zig
	cd src/ && zig build-lib -target wasm32-freestanding ${CFLAGS} p1list-export.zig
	mkdir -p ${DIST}
	mv src/p1list-export.wasm ${DIST}/p1list.wasm




${DIST}/.built: ${DIST}/integer.wasm ${DIST}/integer.js ${DIST}/arith.wasm ${DIST}/arith.js ${DIST}/p1list.wasm
	touch ${DIST}/.built

.PHONY: all
all: ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo