nt.wasm.o: nt.c
	../../../../bin/cowasm-cc -Oz -c nt.c -o nt.wasm.o

build: nt.wasm.o nt.pyx
	python-wasm setup.py build
