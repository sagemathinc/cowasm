CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
PYTHON = ${CWD}/../cpython/dist/wasm
POSIX = ${CWD}/../posix-wasm/dist/wasm
LZMA = ${CWD}/../lzma/dist/wasm


all: dist/.built

dist/.built: dist/index.js dist/wasm/libdylink.a wasm-export node_modules
	touch dist/.built

node_modules:
	npm ci

dist/libc.js: node_modules src/libc.ts src/wasm-export.ts
	npm run build
	touch dist/libc.js

dist/libpython.js: node_modules src/libpython.ts src/wasm-export.ts
	npm run build
	touch dist/libpython.js

dist/index.js: node_modules src/index.ts
	npm run build
	touch dist/index.js

dist/wasm-export/libc.c: dist/libc.js
	mkdir -p dist/wasm-export/
	node ./dist/libc.js > dist/wasm-export/libc.c

dist/wasm-export/libpython.c: dist/libpython.js
	mkdir -p dist/wasm-export/
	node ./dist/libpython.js > dist/wasm-export/libpython.c

wasm-export: dist/wasm-export/libpython.c dist/wasm-export/libc.c

build/wasm/libdylink.o: dist/wasm-export/libc.c
	mkdir -p build/wasm
	zig cc -target wasm32-wasi \
		-w \
		-c \
		-rdynamic \
		-shared \
		-fvisibility=default \
		-I ${POSIX} \
		dist/wasm-export/libc.c \
		-o build/wasm/libdylink.o

# The way we make dist/wasm/libdylink.a is a bit of a cheat -- we do not
# use ar to make an actual archive, and instead what we call "libdylink.a"
# is just a copy of the .a file!  The reason is because
# this way the linker will make all of the __WASM_EXPORT__* functions
# (that return pointers to contents of libc) visible and in the resulting
# wasm file of anything that links this.   If we don't do this, and just use
# ar, then all of that stuff is garbage collected away, and our runtime won't
# work at all.  In particular, this won't work:
#    zig ar -crs dist/wasm/libdylink.a build/wasm/libdylink.o
dist/wasm/libdylink.a: build/wasm/libdylink.o
	mkdir -p dist/wasm
	cp build/wasm/libdylink.o dist/wasm/libdylink.a

test: wasm-export dist/.built
	npm ci
	npm run build
	cd test/freestanding && make test
	cd test/wasi && make test
	cd test/python-extension && make test
	cd test/malloc && make test
	cd test/libc-archive && make test
.PHONY: test

test-native-macos:
	npm ci
	npm run build
	cd test/freestanding && make test-native-macos
	cd test/wasi && make test-native-macos
	cd test/python-extension && make test-native-macos
	cd test/malloc && make test-native-macos
.PHONY: test-native-macos

clean:
	rm -rf build dist tsconfig.tsbuildinfo node_modules
	cd test/freestanding && make clean
	cd test/wasi && make clean
	cd test/python-extension && make clean
	cd test/malloc && make clean
	cd test/libc-archive && make clean
	cd test/libpython-so && make clean

.PHONY: clean
