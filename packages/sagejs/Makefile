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

${DIST}/integer.wasm:
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${GMP_WASM}/include -L${GMP_WASM}/lib ${GMP_WASM}/lib/libgmp.a -O ReleaseSmall integer-export.zig
	mkdir -p ${DIST}
	mv src/integer-export.wasm ${DIST}/integer.wasm

${DIST}/.built: ${DIST}/integer.wasm ${DIST}/integer.js
	touch ${DIST}/.built

.PHONY: all
all: ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo