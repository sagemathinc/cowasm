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
	mkdir -p ${BUILD_WASM} ${DIST_WASM}
	${BIN}/zig cc -target wasm32-wasi -fPIC -c ${SRC}/cxa-thread-atexit-stub.c -o ${BUILD_WASM}/cxa-thread-atexit-stub.o
	${BIN}/zig c++ -target wasm32-wasi -fPIC -c ${SRC}/cxx-data-exports.cpp -o ${BUILD_WASM}/cxx-data-exports.o
	${BIN}/zig wasm-ld \
		--experimental-pic \
		-shared \
		--export-all \
		-u __addtf3 \
		-u __divdc3 \
		-u __divtf3 \
		-u __fixdfti \
		-u __fixunsdfti \
		-u __fixtfti \
		-u __floattidf \
		-u __floatsitf \
		-u __floatunditf \
		-u __floatunsitf \
		-u __floatuntidf \
		-u __floatuntitf \
		-u __muldc3 \
		-u __multf3 \
		-u __subtf3 \
		-u __ashldi3 \
		-u __ashlti3 \
		-u __ashrdi3 \
		-u __ashrti3 \
		-u __lshrdi3 \
		-u __lshrti3 \
		-u __moddi3 \
		-u __modsi3 \
		-u __modti3 \
		-u __udivdi3 \
		-u __udivmoddi4 \
		-u __udivmodsi4 \
		-u __udivmodti4 \
		-u __udivsi3 \
		-u __udivti3 \
		-u __umoddi3 \
		-u __umodsi3 \
		-u __umodti3 \
		--whole-archive ${LIBCXX_ARCHIVES} --no-whole-archive ${COMPILER_RT} \
		${BUILD_WASM}/cxa-thread-atexit-stub.o \
		${BUILD_WASM}/cxx-data-exports.o \
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
