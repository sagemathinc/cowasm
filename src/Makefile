NATIVE = dist/native/.built
WASM = dist/wasm/.built

all: gmp

packages/gmp/${NATIVE}:
	cd packages/gmp && make native

packages/gmp/${WASM}:
	cd packages/gmp && make wasm

.PHONE: gmp
gmp: packages/gmp/${NATIVE} packages/gmp/${WASM}

clean:
	cd packages/gmp && make clean

