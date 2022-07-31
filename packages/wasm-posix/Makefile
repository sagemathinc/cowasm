CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist

PACKAGES = ${CWD}/..
export PATH := ${PACKAGES}/../bin:$(PATH)

.PHONY: all
all: ${DIST}/wasm/.built

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
# -w (=no warnings) since this is almost all fake/stubbed function and would generate
# massive warning issues:
${DIST}/wasm/.built: src/wasm-posix.h src/wasm-posix.c src/threads.h src/threads.c
	mkdir -p ${BUILD}/wasm && cp -v src/* ${BUILD}/wasm
	cd ${BUILD}/wasm/ && \
		zig cc -Oz -w -target wasm32-wasi wasm-posix.c -c -o wasm-posix.o && \
		zig cc -Oz -w -target wasm32-wasi threads.c -c -o threads.o && \
		zig ar -crs libwasmposix.a wasm-posix.o threads.o
	mkdir -p ${DIST}/wasm
	cp src/*.h ${BUILD}/wasm/*.a ${DIST}/wasm/
	touch ${DIST}/wasm/.built


clean:
	rm -rf ${DIST} ${BUILD}


