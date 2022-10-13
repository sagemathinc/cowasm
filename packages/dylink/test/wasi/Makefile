all: test-wasm

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	zig cc -target wasm32-wasi \
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
	zig cc -v -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c build/wasm/libc.o -c -o build/wasm/app.o

build/wasm/dynamic-library.wasm.so: dynamic-library.c
	mkdir -p build/wasm
	wacalc-cc dynamic-library.c -c -o build/wasm/dynamic-library.o
	zig wasm-ld --experimental-pic -shared build/wasm/dynamic-library.o -o build/wasm/dynamic-library.so

test-wasm: build/wasm/app.wasm build/wasm/dynamic-library.wasm.so
	cd build/wasm && node ../../app.js

# NOTE: We're using gcc here (which is really clang on MacOS), because
# the above with gcc replaced by "zig cc" doesn't build properly for me
# with zig 0.10.0-dev.3315+1a16b7214, surely due to zig bugs.
# TODO: make a version of this that works on Linux.
build/native-macos/app.native: app.c
	mkdir -p build/native-macos
	gcc app.c -o build/native-macos/app.native -ldl

build/native-macos/dynamic-library.native.so: dynamic-library.c
	mkdir -p build/native-macos
	gcc -fPIC dynamic-library.c -c -o build/native-macos/dynamic-library.o
	gcc -shared -undefined dynamic_lookup build/native-macos/dynamic-library.o -o build/native-macos/dynamic-library.so

test-native-macos: build/native-macos/app.native build/native-macos/dynamic-library.native.so
	cd build/native-macos && ./app.native

.PHONEY: test
test: test-wasm

clean:
	rm -rf build