all: test-wasm

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	zig cc -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		-ferror-limit=10000 \
		app.c \
		-L../../dist/wasm/ -ldylink \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/hello.so: hello.c
	mkdir -p build/wasm
	zig-fPIC cc hello.c -c -o build/wasm/hello.o
	zig wasm-ld --experimental-pic -shared build/wasm/hello.o -o build/wasm/hello.so

test-wasm: build/wasm/app.wasm build/wasm/hello.so
	cd build/wasm && node ../../app.js

.PHONEY: test
test: test-wasm

clean:
	rm -rf build