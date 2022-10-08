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

${DIST_WASM}/bin/chown: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chown

${DIST_WASM}/bin/chgrp: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chgrp

UTILS = ${DIST_WASM}/bin/basename ${DIST_WASM}/bin/cat ${DIST_WASM}/bin/chgrp ${DIST_WASM}/bin/chmod ${DIST_WASM}/bin/chown ${DIST_WASM}/bin/comm ${DIST_WASM}/bin/cp  ${DIST_WASM}/bin/csplit ${DIST_WASM}/bin/ls

${DIST_WASM}/.built: ${UTILS}
	touch ${BUILD_WASM}/.source

strip:
	find  ${DIST_WASM}/bin -type f | xargs -n1 wasm-strip
.PHONY: strip