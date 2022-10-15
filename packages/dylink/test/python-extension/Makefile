all: test-wasm

include ../Makefile-common

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	${ZIG} cc -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c \
		-L../../dist/wasm/ -ldylink \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/app.o: app.c
	mkdir -p build/wasm
	${ZIG} cc -v -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c build/wasm/libc.o -c -o build/wasm/app.o

build/wasm/hello.so: hellomodule.c
	mkdir -p build/wasm
	${COWASM} hellomodule.c -o build/wasm/hello.so

test-wasm: build/wasm/app.wasm build/wasm/hello.so
	cd build/wasm && node ../../app.js

# NOTE: We're using gcc here (which is really clang on MacOS), because
# the above with gcc replaced by "zig cc" doesn't build properly for me
# with zig 0.10.0-dev.3315+1a16b7214, surely due to zig bugs.
# TODO: make a version of this that works on Linux.
build/native-macos/app.native: app.c
	mkdir -p build/native-macos
	gcc app.c -o build/native-macos/app.native -ldl

build/native-macos/hello.so: hellomodule.c
	mkdir -p build/native-macos
	gcc -fPIC hellomodule.c -c -o build/native-macos/hellomodule.o
	gcc -shared -undefined dynamic_lookup build/native-macos/hellomodule.o -o build/native-macos/hello.so

test-native-macos: build/native-macos/app.native build/native-macos/hello.so
	cd build/native-macos && ./app.native

.PHONEY: test
test: test-wasm

clean:
	rm -rf build