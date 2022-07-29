LINK = -Xlinker --import-memory -Xlinker --import-table
ZIG = zig cc -target wasm32-freestanding

CLANGBIN = /Users/wstein/build/clang/clang+llvm-14.0.6-x86_64-apple-darwin/bin
#CLANGBIN = /opt/homebrew/Cellar/llvm/14.0.6_1/bin

EMCC = emcc -s SIDE_MODULE

zig:
	${ZIG}  a.c -c -o a.wasm.o
	${ZIG}  b.c -c -o b.wasm.o
	${ZIG} -shared -rdynamic a.wasm.o -o a.wasm ${LINK}
	${ZIG} -shared -rdynamic b.wasm.o -o b.wasm -Xlinker --global-base=500000 ${LINK}
	node ./a.js

native:
	zig cc -fPIC a.c -c -o a.native.o
	zig cc -fPIC b.c -c -o b.native.o
	zig cc -shared -rdynamic a.native.o -o a.native.dylib
	zig cc main.c -o main.native
	./main.native

wat:
	wasm2wat a.wasm > a.wat
	wasm2wat b.wasm > b.wat


emcc:
	${EMCC} a.c -o a.wasm
	${EMCC} b.c -o b.wasm
	node ./a.js

# https://github.com/llvm/llvm-project/blob/main/lld/docs/WebAssembly.rst
# --experimental-pic = supress the warning that -shared causes.
clang:
	${CLANGBIN}/clang ${OPT}   -fvisibility=default -fPIC -target wasm32-undefined-emscripten -c a.c -o a.wasm-em.o
	${CLANGBIN}/wasm-ld ${OPT} --experimental-pic -shared a.wasm-em.o -o a.wasm
	${CLANGBIN}/clang ${OPT}   -fvisibility=default -fPIC -target wasm32-undefined-emscripten -c b.c -o b.wasm-em.o
	${CLANGBIN}/wasm-ld ${OPT} --experimental-pic -shared b.wasm-em.o -o b.wasm
	node ./a.js


.PHONY: build
clean:
	rm -rf *.o *.dylib *.wasm *.wat zig-cache a.out