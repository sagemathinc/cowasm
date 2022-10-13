dist/app.wasm: app.c
	mkdir -p dist
	zig cc -target wasm32-freestanding \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c -o dist/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

dist/dynamic-library.wasm.so: dynamic-library.c
	mkdir -p dist
	wacalc-cc dynamic-library.c -c -o dist/dynamic-library.o
	zig wasm-ld --experimental-pic -shared dist/dynamic-library.o -o dist/dynamic-library.wasm.so

test: dist/app.wasm dist/dynamic-library.wasm.so
	node app.js

clean:
	rm -rf dist