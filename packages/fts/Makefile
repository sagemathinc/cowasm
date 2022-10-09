# This builds the fts library

## TODO: probably just move this to compat in coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm

all: wasm

include ../build/Makefile-rules

###
# WASM
###

${BUILD_WASM}/.source:: src/fts.c src/fts.h src/config.h
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp src/fts.* src/config.h ${BUILD_WASM}
	touch ${BUILD_WASM}/.source

${DIST_WASM}/.built: ${BUILD_WASM}/.source
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	zig cc -target wasm32-wasi -DHAVE_CONFIG_H -I. -Oz -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -I${POSIX_WASM}/dist/wasm -c fts.c -o fts.o \
		&&	zig ar -crs libfts.a fts.o
	mkdir -p ${DIST_WASM}/include && cp ${BUILD_WASM}/fts.h ${DIST_WASM}/include
	mkdir -p ${DIST_WASM}/lib && cp ${BUILD_WASM}/libfts.a ${DIST_WASM}/lib
	touch ${DIST_WASM}/.built
