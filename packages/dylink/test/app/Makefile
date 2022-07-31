build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	zig cc -target wasm32-freestanding \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c -o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/dynamic-library.wasm.so: dynamic-library.c
	mkdir -p build/wasm
	../../bin/zig-fPIC cc dynamic-library.c -c -o build/wasm/dynamic-library.o
	zig wasm-ld --experimental-pic -shared build/wasm/dynamic-library.o -o build/wasm/dynamic-library.so

test-wasm: build/wasm/app.wasm build/wasm/dynamic-library.wasm.so
	cd build/wasm && node ../../app.js

# NOTE: We're using gcc here (which is really clang on MacOS), because
# the above with gcc replaced by "zig cc" doesn't build properly for me
# with zig 0.10.0-dev.3315+1a16b7214, surely due to zig bugs.
build/native/app.native: app-native.c app.c
	mkdir -p build/native
	gcc app-native.c -o build/native/app.native

build/native/dynamic-library.native.so: dynamic-library.c
	mkdir -p build/native
	gcc -fPIC dynamic-library.c -c -o build/native/dynamic-library.o
	gcc -shared -undefined dynamic_lookup build/native/dynamic-library.o -o build/native/dynamic-library.so

test-native: build/native/app.native build/native/dynamic-library.native.so
	cd build/native && ./app.native

.PHONEY: test
test: test-wasm test-native

clean:
	rm -rf build