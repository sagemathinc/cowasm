# Some C level posix support for building WASM code.

include ../build/Makefile-vars

all: wasm

include ../build/Makefile-rules

# WASM

DEPS = $(shell find src -type f \( -iname '*.h' \))
CFLAGS = -Oz

${BUILD_WASM}/%.o: ${SRC}/%.c ${DEPS}
	mkdir -p `dirname $@`
	waszee-cc -c -o $@ $< ${CFLAGS}

BUILTINS = ${BUILD_WASM}/lib/builtins
LEGACY = ${BUILD_WASM}/lib/legacy
OBJECTS = ${BUILD_WASM}/posix-wasm.o ${BUILD_WASM}/threads.o \
	${BUILTINS}/muldc3.o ${BUILTINS}/mulsc3.o ${BUILTINS}/multc3.o \
	${LEGACY}/err.o \
	${BUILD_WASM}/lib/stdlib/qsort_nr.o

${BUILD_WASM}/libposix.a: ${OBJECTS}
	zig ar -crs ${BUILD_WASM}/libposix.a ${OBJECTS}

${DIST_WASM}/.built: ${BUILD_WASM}/libposix.a
	mkdir -p ${DIST_WASM}
	cp ${SRC}/posix-wasm.h ${SRC}/emscripten.h ${BUILD_WASM}/libposix.a ${DIST_WASM}/
	touch ${DIST_WASM}/.built


