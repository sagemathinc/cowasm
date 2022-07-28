CC = zig cc -fPIC -target wasm32-freestanding \
	 -shared -rdynamic \
	 -Xlinker --import-memory \
	 -Xlinker --import-table

EMCC = emcc -s SIDE_MODULE

.PHONY: build
build:
	${CC} a.c -o a.wasm
	${CC} b.c -o b.wasm
	node ./a.js

.PHONY: build-base
build-base:
	${CC} a.c -o a.wasm
	${CC} b.c -o b.wasm  -Xlinker  --global-base=100000
	node ./a.js


wat:
	wasm2wat a.wasm > a.wat
	wasm2wat b.wasm > b.wat


.PHONY: build-emcc
build-emcc:
	${EMCC} a.c -o a.wasm
	${EMCC} b.c -o b.wasm
	node ./a.js


.PHONY: build
clean:
	rm -rf *.wasm *.wat zig-cache a.out