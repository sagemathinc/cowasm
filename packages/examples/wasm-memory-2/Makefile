CC = zig cc -target wasm32-freestanding -shared -rdynamic -Xlinker --import-memory -Xlinker --import-table

.PHONY: build
build:
	${CC} a.c -o a.wasm
	${CC} b.c -o b.wasm
	node ./a.js


.PHONY: build
clean:
	rm -rf *.wasm *.wat zig-cache a.out