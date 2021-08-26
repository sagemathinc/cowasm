ROOT = `pwd`/../../
NATIVE = ${ROOT}/dist.native
INATIVE = ${NATIVE}/include/python3.9
LNATIVE = ${NATIVE}/lib
WASM = ${ROOT}/dist.wasm
IWASM = ${WASM}/include/python3.9
LWASM = ${WASM}/lib

hello-c.exe: hello.c
	zig cc hello.c -lpython3.9 -L${LNATIVE} -I${INATIVE} -o hello-c.exe

hello-c.wasm: hello.c
	zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL -L${LWASM} -I${IWASM} hello.c -lpython3.9  -lc -o hello-c.wasm