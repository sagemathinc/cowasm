build:
	zig cc -target wasm32-freestanding -rdynamic -shared -fvisibility=default a.c -o a.wasm
	zig-emscripten cc -target wasm32-emscripten -fvisibility=default -fPIC b.c -c -o b.o
	zig wasm-ld  --experimental-pic -shared -no-entry b.o -o b.wasm
	node a.js

clean:
	rm -rf *.o *.dylib *.wasm *.wat zig-cache a.out