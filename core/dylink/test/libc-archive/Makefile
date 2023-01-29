all: test-wasm

include ../Makefile-common

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	${ZIG} cc -target wasm32-wasi \
		app.c \
		-rdynamic \
		-L../../dist/wasm/ -ldylink \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/hello.so: hello.c
	mkdir -p build/wasm
	${COWASM} hello.c -o build/wasm/hello.so

test-wasm: build/wasm/app.wasm build/wasm/hello.so
	cd build/wasm && node ../../app.js

.PHONEY: test
test: test-wasm
