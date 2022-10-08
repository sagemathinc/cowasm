# This builds the lua interpreter

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
FTS = ${PACKAGES}/fts/dist/wasm/

all: wasm

include ../build/Makefile-rules

CC = zig cc -target wasm32-wasi
CFLAGS = -Oz -I${POSIX_WASM} -I${SRC}/compat -I${FTS}/include -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_MMAN
LDFLAGS = ${FTS}/lib/libfts.a -lc

${BUILD_WASM}/.source:: src/**
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.source

${DIST_WASM}/bin/%: ${SRC}/utils/%/*.c | ${BUILD_WASM}/.source
	mkdir -p ${DIST_WASM}/bin
	${CC} ${CFLAGS} ${LDFLAGS} $^ -o $@

${DIST_WASM}/.built: ${DIST_WASM}/bin/basename ${DIST_WASM}/bin/cat ${DIST_WASM}/bin/cp ${DIST_WASM}/bin/ls 
	touch ${BUILD_WASM}/.source
