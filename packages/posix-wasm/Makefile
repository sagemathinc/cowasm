CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
SRC = ${CWD}/src

PACKAGES = ${CWD}/..
export PATH := ${PACKAGES}/../bin:$(PATH)

.PHONY: all
all: ${DIST}/wasm/.built ${DIST}/wasm-shared/.built

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
# -w (=no warnings) since this is almost all fake/stubbed function and would generate
# massive warning issues:
${BUILD}/wasm/libwasmposix.a: src/posix-wasm.h src/posix-wasm.c src/threads.h src/threads.c
	mkdir -p ${BUILD}/wasm
	cd ${BUILD}/wasm/ && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/posix-wasm.c -c -o posix-wasm.o && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/threads.c -c -o threads.o && \
		zig ar -crs libwasmposix.a posix-wasm.o threads.o
	mkdir -p ${DIST}/wasm
	cp ${SRC}/*.h ${BUILD}/wasm/libwasmposix.a ${DIST}/wasm/

${DIST}/wasm/.built: ${BUILD}/wasm/libwasmposix.a
	touch ${DIST}/wasm/.built

${BUILD}/wasm-shared/libwasmposix.a: src/posix-wasm.h src/posix-wasm.c src/threads.h src/threads.c
	mkdir -p ${BUILD}/wasm-shared
	cd ${BUILD}/wasm-shared/ && \
		zig-fPIC cc -Oz -w ${SRC}/posix-wasm.c -c -o posix-wasm.o && \
		zig-fPIC cc -Oz -w ${SRC}/threads.c -c -o threads.o && \
		zig ar -crs libwasmposix.a posix-wasm.o threads.o
	mkdir -p ${DIST}/wasm-shared
	cp ${SRC}/*.h ${BUILD}/wasm-shared/libwasmposix.a ${DIST}/wasm-shared/

${DIST}/wasm-shared/.built: ${BUILD}/wasm-shared/libwasmposix.a
	touch ${DIST}/wasm-shared/.built


clean:
	rm -rf ${DIST} ${BUILD}


