# This builds the lua interpreter

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
FTS = ${PACKAGES}/fts/dist/wasm/

all: wasm

include ../build/Makefile-rules

###
# WASM
###

${BUILD_WASM}/.source:: src/*
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.source

CC = zig cc -target wasm32-wasi
CFLAGS = -Oz -I${POSIX_WASM} -I../compat -I.. -I. -I${FTS}/include -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_MMAN
LDFLAGS = ${FTS}/lib/libfts.a -lc

${DIST_WASM}/.built: ${BUILD_WASM}/.source
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/bin
	cd ${BUILD_WASM}/ls && ${CC} ${CFLAGS} ${LDFLAGS} *.c -o ls && cp -v ls ${DIST_WASM}/bin/
	cd ${BUILD_WASM}/cp && ${CC} ${CFLAGS} ${LDFLAGS} *.c -o cp && cp -v cp ${DIST_WASM}/bin/
	touch ${BUILD_WASM}/.source
