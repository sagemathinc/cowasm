# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
FTS = ${PACKAGES}/fts/dist/wasm/

all: wasm

include ../build/Makefile-rules

CC = zig cc -target wasm32-wasi
CFLAGS = -Oz -I${POSIX_WASM} -I${SRC}/compat -I${FTS}/include -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_MMAN
LDFLAGS = ${FTS}/lib/libfts.a ${POSIX_WASM}/libposix.a -lc -lwasi-emulated-mman -lwasi-emulated-process-clocks -lwasi-emulated-signal

${BUILD_WASM}/.source:: src/**
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.source

# TODO: This build is inefficient in that it is compiling the same compat c code every time,
# rather than just once into an archive.

${DIST_WASM}/bin/%: ${SRC}/utils/%/*.c | ${BUILD_WASM}/.source
	mkdir -p ${DIST_WASM}/bin
	${CC} ${CFLAGS} ${LDFLAGS} ${SRC}/compat/*.c $^ -o $@

${DIST_WASM}/bin/chown: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chown

${DIST_WASM}/bin/chgrp: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chgrp

UTILS = ${DIST_WASM}/bin/basename ${DIST_WASM}/bin/cat ${DIST_WASM}/bin/chgrp ${DIST_WASM}/bin/chmod ${DIST_WASM}/bin/chown ${DIST_WASM}/bin/comm ${DIST_WASM}/bin/cp  ${DIST_WASM}/bin/csplit ${DIST_WASM}/bin/cut ${DIST_WASM}/bin/date ${DIST_WASM}/bin/factor ${DIST_WASM}/bin/ls ${DIST_WASM}/bin/sleep

${DIST_WASM}/.built: ${UTILS}
	touch ${BUILD_WASM}/.source

strip:
	find  ${DIST_WASM}/bin -type f | xargs -n1 wasm-strip
.PHONY: strip