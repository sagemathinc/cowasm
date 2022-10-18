# Some C level posix support for building WASM code.

include ../build/Makefile-vars

all: wasm

include ../build/Makefile-rules

BUILTINS = ${BUILD_WASM}/lib/builtins
LEGACY = ${BUILD_WASM}/lib/legacy
TEMP = ${BUILD_WASM}/lib/temp
FTS = ${BUILD_WASM}/lib/fts
BSD = ${BUILD_WASM}/lib/bsd

OBJECTS = ${BUILD_WASM}/posix-wasm.o ${BUILD_WASM}/threads.o \
	${BUILTINS}/muldc3.o ${BUILTINS}/mulsc3.o ${BUILTINS}/multc3.o \
	${LEGACY}/err.o \
	${BUILD_WASM}/lib/stdlib/qsort_nr.o \
	${TEMP}/mkdtemp.o ${TEMP}/mkstemps.o \
	${FTS}/fts.o \
	${BSD}/strtonum.o


DEPS = $(shell find src -type f \( -iname '*.h' \))
CFLAGS = -Oz -I${SRC}

${BUILD_WASM}/%.o: ${SRC}/%.c ${DEPS}
	mkdir -p `dirname $@`
	cowasm-cc -c -o $@ $< ${CFLAGS}

${BUILD_WASM}/libposix.a: ${OBJECTS}
	zig ar -crs ${BUILD_WASM}/libposix.a ${OBJECTS}

${DIST_WASM}/.built: ${BUILD_WASM}/libposix.a
	mkdir -p ${DIST_WASM}
	cp ${SRC}/posix-wasm.h ${SRC}/emscripten.h ${SRC}/lib/fts/fts.h ${SRC}/lib/fts/fts.h ${BUILD_WASM}/libposix.a ${DIST_WASM}/
	touch ${DIST_WASM}/.built

test:
	echo "no tests yet"