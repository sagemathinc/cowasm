include ../build/Makefile-vars

all: wasm

include ../build/Makefile-rules

##################
# WASM - STATIC
##################

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
# -w (=no warnings) since this is almost all fake/stubbed function and would generate
# massive warning issues:
${BUILD_WASM}/libposix.a: src/posix-wasm.h src/posix-wasm.c src/threads.h src/threads.c
	mkdir -p ${BUILD_WASM}
	cd ${BUILD_WASM}/ && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/posix-wasm.c -c -o posix.o && \
		zig cc -Oz -w -target wasm32-wasi ${SRC}/threads.c -c -o threads.o && \
		zig cc -Oz -target wasm32-wasi ${SRC}/lib/builtins/muldc3.c -c -o muldc3.o && \
		zig cc -Oz -target wasm32-wasi ${SRC}/lib/builtins/mulsc3.c -c -o mulsc3.o && \
		zig cc -Oz -target wasm32-wasi ${SRC}/lib/builtins/multc3.c -c -o multc3.o && \
		zig ar -crs libposix.a posix.o threads.o muldc3.o  mulsc3.o  multc3.o

${DIST_WASM}/.built: ${BUILD_WASM}/libposix.a
	mkdir -p ${DIST_WASM}
	cp ${SRC}/posix-wasm.h ${SRC}/emscripten.h ${BUILD_WASM}/libposix.a ${DIST_WASM}/
	touch ${DIST_WASM}/.built


