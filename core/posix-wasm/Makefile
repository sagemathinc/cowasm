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
	${FTS}/fts.o ${FTS}/cowasm_stat.o  \
	${BSD}/strtonum.o 	${BSD}/setmode.o  ${BSD}/merge.o ${BSD}/heapsort.o ${BSD}/strtoq.o ${BSD}/rpmatch.o

DEPS = $(shell find src -type f \( -iname '*.h' \))
DEBUG =
#DEBUG = "-g"
CFLAGS = ${DEBUG} -Oz -I${SRC}

${BUILD_WASM}/%.o: ${SRC}/%.c ${DEPS}
	cd ../build && make zig
	mkdir -p `dirname $@`
	cowasm-cc -c -o $@ $< ${CFLAGS}

${BUILD_WASM}/libposix.a: ${OBJECTS}
	cd ../build && make zig
	zig ar -crs ${BUILD_WASM}/libposix.a ${OBJECTS}

${DIST_WASM}/.built: ${BUILD_WASM}/libposix.a
	mkdir -p ${DIST_WASM}
	cp -rv ${SRC}/bits ${SRC}/posix-wasm.h ${SRC}/emscripten.h ${SRC}/lib/fts/fts.h ${SRC}/lib/fts/fts.h ${BUILD_WASM}/libposix.a ${DIST_WASM}/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	echo "no tests yet (beyond 'it builds')"