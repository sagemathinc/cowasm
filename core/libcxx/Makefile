include ../build/Makefile-vars

EMSCRIPTEN_CXX_LIB ?= /usr/share/emscripten/cache/sysroot/lib/wasm32-emscripten/pic
LIBCXX_ARCHIVES = \
	${EMSCRIPTEN_CXX_LIB}/libc++.a \
	${EMSCRIPTEN_CXX_LIB}/libc++abi.a \
	${EMSCRIPTEN_CXX_LIB}/libunwind.a

COMPILER_RT = ${EMSCRIPTEN_CXX_LIB}/libcompiler_rt.a
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: wasm

include ../build/Makefile-rules

${DIST_WASM}/libcxx.so: ${LIBCXX_ARCHIVES} ${COMPILER_RT}
	cd ../build && make zig
	mkdir -p ${DIST_WASM}
	${BIN}/zig wasm-ld \
		--experimental-pic \
		-shared \
		--export-all \
		-u __divdc3 \
		-u __muldc3 \
		--whole-archive ${LIBCXX_ARCHIVES} --no-whole-archive ${COMPILER_RT} \
		-o ${DIST_WASM}/libcxx.so

${DIST_WASM}/.built: ${DIST_WASM}/libcxx.so
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	test -s ${DIST_WASM}/libcxx.so

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone:
	mkdir -p ${BUILD_WASI_SDK}
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

.PHONY: test
