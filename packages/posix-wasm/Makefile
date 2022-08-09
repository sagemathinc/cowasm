CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
SRC = ${CWD}/src

PACKAGES = ${CWD}/..
export PATH := ${PACKAGES}/../bin:$(PATH)

.PHONY: all
all: ${DIST}/wasm/.built ${DIST}/wasm-shared/.built


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


##################
# WASM - SHARED
##################

${DIST}/wasm-shared:
	mkdir -p ${DIST}/wasm-shared/

${BUILD}/wasm-shared:
	mkdir -p ${BUILD}/wasm-shared

dirs-shared: ${DIST}/wasm-shared ${BUILD}/wasm-shared

${BUILD}/wasm-shared/posix.o: dirs-shared src/posix-wasm.h src/posix-wasm.c
	cd ${BUILD}/wasm-shared/ && zig-fPIC cc -Oz -w ${SRC}/posix-wasm.c -c -o posix.o

${BUILD}/wasm-shared/threads.o: dirs-shared src/threads.h src/threads.c
	cd ${BUILD}/wasm-shared/ && zig-fPIC cc -Oz -w ${SRC}/threads.c -c -o threads.o

${DIST}/wasm-shared/libposix.a: dirs-shared ${BUILD}/wasm-shared/posix.o ${BUILD}/wasm-shared/threads.o
	cd ${BUILD}/wasm-shared/ && zig ar -crs ${DIST}/wasm-shared/libposix.a posix.o threads.o

${DIST}/wasm-shared/posix-wasm.h: dirs-shared ${SRC}/posix-wasm.h
	cp ${SRC}/posix-wasm.h ${DIST}/wasm-shared/

${DIST}/wasm-shared/emscripten.h: dirs-shared ${SRC}/posix-wasm.h
	cp ${SRC}/emscripten.h ${DIST}/wasm-shared/

${DIST}/wasm-shared/libposix.so: dirs-shared ${BUILD}/wasm-shared/posix.o ${BUILD}/wasm-shared/threads.o
	zig wasm-ld --experimental-pic -shared -s ${BUILD}/wasm-shared/posix.o ${BUILD}/wasm-shared/threads.o -o ${DIST}/wasm-shared/libposix.so

${DIST}/wasm-shared/debug/libposix.so: dirs-shared ${BUILD}/wasm-shared/posix.o ${BUILD}/wasm-shared/threads.o
	mkdir -p ${DIST}/wasm-shared/debug/
	zig wasm-ld --experimental-pic -shared ${BUILD}/wasm-shared/posix.o ${BUILD}/wasm-shared/threads.o -o ${DIST}/wasm-shared/debug/libposix.so

${DIST}/wasm-shared/.built: ${DIST}/wasm-shared/libposix.so ${DIST}/wasm-shared/debug/libposix.so ${DIST}/wasm-shared/libposix.a ${DIST}/wasm-shared/posix-wasm.h ${DIST}/wasm-shared/emscripten.h
	touch ${DIST}/wasm-shared/.built


clean:
	rm -rf ${DIST} ${BUILD}


