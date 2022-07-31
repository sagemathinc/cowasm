CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist

PACKAGES = ${CWD}/..
export PATH := ${PACKAGES}/../bin:$(PATH)

.PHONY: all
all: ${DIST}/libwasmposix.a

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
${DIST}/libwasmposix.a: src/wasm-posix.h src/wasm-posix.c src/threads.h src/threads.c
	mkdir -p ${DIST}
	# -w (=no warnings) since this is almost all fake/stubbed function and would generate massive warning issues:
	cd src/ \
		&& zig-fPIC cc -Oz -w -target wasm32-wasi wasm-posix.c -c -o ${DIST}/wasm-posix.o
	cd src/ \
		&& zig-fPIC cc -Oz -w -target wasm32-wasi threads.c -c -o ${DIST}/threads.o
	cd ${DIST} && zig ar -crs libwasmposix.a wasm-posix.o threads.o
	# rm ${DIST}/wasm-posix.o  ${DIST}/threads.o
	cp src/*.h ${DIST}

clean:
	rm -rf ${DIST}


