CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
SRC = ${CWD}/src

PACKAGES = ${CWD}/..
export PATH := ${PACKAGES}/../bin:$(PATH)

.PHONY: all
all: ${DIST}/wasm/.built


##################
# WASM - STATIC
##################

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
# -w (=no warnings) since this is almost all fake/stubbed function and would generate
# massive warning issues:
${BUILD}/wasm/libposix.a: src/posix-wasm.h src/posix-wasm.c src/threads.h src/threads.c
	mkdir -p ${BUILD}/wasm
	cd ${BUILD}/wasm/ && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/posix-wasm.c -c -o posix.o && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/threads.c -c -o threads.o && \
		zig ar -crs libposix.a posix.o threads.o
	mkdir -p ${DIST}/wasm
	cp ${SRC}/posix-wasm.h ${SRC}/emscripten.h ${BUILD}/wasm/libposix.a ${DIST}/wasm/

${DIST}/wasm/.built: ${BUILD}/wasm/libposix.a
	touch ${DIST}/wasm/.built

clean:
	rm -rf ${DIST} ${BUILD}


