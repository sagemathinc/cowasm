all: test-wasm

include ../Makefile-common

COWASM_CXX = ${BIN}/cowasm-c++
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

.PHONY: test
test: test-wasm
