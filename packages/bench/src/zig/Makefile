nt.wasm.o: nt.zig
	zig-fPIC0 build-lib nt.zig

build: nt.wasm.o nt.pyx
	zython-dev setup.py build
