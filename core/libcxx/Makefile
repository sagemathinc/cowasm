include ../build/Makefile-vars

EMSCRIPTEN_CXX_LIB ?= /usr/share/emscripten/cache/sysroot/lib/wasm32-emscripten/pic
LIBCXX_ARCHIVES = \
	${EMSCRIPTEN_CXX_LIB}/libc++.a \
	${EMSCRIPTEN_CXX_LIB}/libc++abi.a \
	${EMSCRIPTEN_CXX_LIB}/libunwind.a

COMPILER_RT = ${EMSCRIPTEN_CXX_LIB}/libcompiler_rt.a

all: wasm

include ../build/Makefile-rules

${DIST_WASM}/libcxx.so: ${LIBCXX_ARCHIVES} ${COMPILER_RT}
	cd ../build && make zig
	mkdir -p ${DIST_WASM}
	${BIN}/zig wasm-ld \
		--experimental-pic \
		-shared \
		--export-all \
		--whole-archive ${LIBCXX_ARCHIVES} --no-whole-archive ${COMPILER_RT} \
		-o ${DIST_WASM}/libcxx.so

${DIST_WASM}/.built: ${DIST_WASM}/libcxx.so
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	test -s ${DIST_WASM}/libcxx.so

.PHONY: test
