build:
	zig cc -v -target wasm32-freestanding -rdynamic -shared -fvisibility=default a.c -o a.wasm \
		-Xlinker --import-memory -Xlinker --import-table
	zig-fPIC cc -target wasm32-emscripten -fvisibility=default -fPIC b.c -c -o b.o
	zig wasm-ld  --experimental-pic -shared b.o -o b.wasm
	node a.js

clean:
	rm -rf *.o *.dylib *.wasm *.wat zig-cache a.out