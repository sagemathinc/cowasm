all: test-wasm

include ../Makefile-common

COWASM_CXX = ${BIN}/cowasm-c++
WASI_SDK_CLANGXX = ${BIN}/wasi-sdk-clang++-next
WASI_SDK_OBJDUMP = ${BIN}/wasi-sdk-llvm-objdump-next
WASI_SDK_STRINGS = ${BIN}/wasi-sdk-llvm-strings-next
LIBCXX_WASM = ../../../libcxx/dist/wasm

${LIBCXX_WASM}/libcxx.so:
	cd ../../../libcxx && make wasm

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	${ZIG} cc -target wasm32-wasi \
		app.c \
		-rdynamic \
		-L../../dist/wasm/ -ldylink \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/lib.o: lib.cpp
	mkdir -p build/wasm
	PATH=${BIN}:$${PATH} ${COWASM_CXX} -c lib.cpp -o build/wasm/lib.o

build/wasm/lib.so: build/wasm/lib.o ${LIBCXX_WASM}/libcxx.so
	${ZIG} wasm-ld \
		--experimental-pic \
		-shared \
		-o build/wasm/lib.so \
		build/wasm/lib.o \
		${LIBCXX_WASM}/libcxx.so

build/wasm/libcxx.so: ${LIBCXX_WASM}/libcxx.so
	mkdir -p build/wasm
	cp ${LIBCXX_WASM}/libcxx.so build/wasm/libcxx.so

test-wasm: build/wasm/app.wasm build/wasm/lib.so build/wasm/libcxx.so
	cd build/wasm && node ../../app.js

build/wasi-sdk/app.wasm: app.c
	mkdir -p build/wasi-sdk
	${ZIG} cc -target wasm32-wasi \
		app.c \
		-rdynamic \
		-L../../dist/wasm/ -ldylink \
		-o build/wasi-sdk/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasi-sdk/lib.so: lib.cpp
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANGXX} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-shared \
		-nostdlib \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		lib.cpp \
		$$(${WASI_SDK_CLANGXX} -target wasm32-wasip1 -print-file-name=libc++.a) \
		$$(${WASI_SDK_CLANGXX} -target wasm32-wasip1 -print-file-name=libc++abi.a) \
		-o build/wasi-sdk/lib.so

build/wasi-sdk/.checked: build/wasi-sdk/app.wasm build/wasi-sdk/lib.so
	${WASI_SDK_OBJDUMP} -h build/wasi-sdk/lib.so | grep 'dylink\.0'
	${WASI_SDK_STRINGS} build/wasi-sdk/lib.so | grep '^string_size$$'
	! ${WASI_SDK_STRINGS} build/wasi-sdk/lib.so | grep 'needed_dynlibs'
	touch build/wasi-sdk/.checked

test-wasi-sdk-next: build/wasi-sdk/.checked
	cd build/wasi-sdk && node ../../app.js

.PHONY: test
test: test-wasm

.PHONY: test-wasi-sdk-next
