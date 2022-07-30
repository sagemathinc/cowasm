dist/app.wasm:
	mkdir -p dist
	zig cc -target wasm32-freestanding \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c -o dist/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

dist/dynamic-library.wasm.so:
	mkdir -p dist
	../../bin/zig-fPIC cc dynamic-library.c -c -o dist/dynamic-library.o
	zig wasm-ld --experimental-pic -shared dist/dynamic-library.o -o dist/dynamic-library.wasm.so

run: dist/app.wasm dist/dynamic-library.wasm.so
	node app.js

clean:
	rm -rf dist