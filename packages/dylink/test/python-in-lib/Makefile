CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
PYTHON = ${CWD}/../../../cpython/dist/wasm-shared
POSIX = ${CWD}/../../../posix-wasm/dist/wasm-shared/
LZMA = ${CWD}/../../../lzma/dist/wasm-shared/


all: test-wasm

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	zig cc -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c \
		../../dist/wasm-export/libc.c \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/app.o: app.c
	mkdir -p build/wasm
	zig cc -v -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c build/wasm/libc.o -c -o build/wasm/app.o

build/wasm/hello.so: hello.c
	mkdir -p build/wasm
	../../bin/zig-fPIC cc hello.c -c -o build/wasm/hello.o -I ${PYTHON}/include/python3.11 -I ${POSIX}
	zig wasm-ld --experimental-pic -shared build/wasm/hello.o ${PYTHON}/lib/libpython3.11.a ${POSIX}/libwasmposix.a ${LZMA}/lib/liblzma.a -o build/wasm/hello.so

test-wasm: build/wasm/app.wasm build/wasm/hello.so
	cd build/wasm && node ../../app.js

.PHONEY: test
test: test-wasm

clean:
	rm -rf build