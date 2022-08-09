CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
PYTHON = ${CWD}/../cpython/dist/wasm
POSIX = ${CWD}/../posix-wasm/dist/wasm
LZMA = ${CWD}/../lzma/dist/wasm


all: dist/.built

node_modules:
	npm ci
.PHONY: node_modules

dist/libc.js: node_modules src/libc.ts src/wasm-export.ts
	npm run build

dist/libpython.js: node_modules src/libpython.ts src/wasm-export.ts
	npm run build

dist/index.js: src/index.ts
	npm run build

dist/wasm-export/libc.c: dist/libc.js
	mkdir -p dist/wasm-export/
	node ./dist/libc.js > dist/wasm-export/libc.c

dist/wasm-export/libpython.c: dist/libpython.js
	mkdir -p dist/wasm-export/
	node ./dist/libpython.js > dist/wasm-export/libpython.c

.PHONY: wasm-export
wasm-export: dist/wasm-export/libpython.c dist/wasm-export/libc.c


# The -s below is to not include debug symbols, which makes the file
# much smaller.
BUILD_DYLINK = zig cc -target wasm32-wasi \
		-w \
		-c \
		-rdynamic \
		-shared \
		-fvisibility=default \
		-I ${POSIX} \
		dist/wasm-export/libc.c

build/wasm/libdylink.o: dist/wasm-export/libc.c
	mkdir -p build/wasm
	${BUILD_DYLINK} -o build/wasm/libdylink.o

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


####################
# libpython.so Python shared object library
# **NOT USED AT ALL**
####################

build/wasm/libpython.o: dist/wasm-export/libpython.c
	zig-fPIC cc dist/wasm-export/libpython.c -c -o build/wasm/libpython.o -I${PYTHON}/include/python3.11 -I${POSIX}

BUILD_LIBPYTHON = zig wasm-ld --experimental-pic -shared build/wasm/libpython.o \
	${PYTHON}/lib/libpython3.11.a ${LZMA}-shared/lib/liblzma.a ${POSIX}-shared/libposix.a  \
	${CWD}/../cpython/build/wasm-shared/Modules/_decimal/libmpdec/libmpdec.a

dist/wasm/libpython.so: build/wasm/libpython.o
	mkdir -p dist/wasm
	${BUILD_LIBPYTHON} -o dist/wasm/libpython.so -s  # the -s strips debug symbols

dist/wasm/debug/libpython.so: build/wasm/libpython.o
	mkdir -p dist/wasm/debug
	${BUILD_LIBPYTHON} -o dist/wasm/debug/libpython.so

dist/.built: dist/wasm-export/libc.c dist/index.js dist/wasm/libdylink.a wasm-export
	touch dist/.built

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
.PHONY: test

clean:
	rm -rf build dist tsconfig.tsbuildinfo node_modules
	cd test/freestanding && make clean
	cd test/wasi && make clean
	cd test/python-extension && make clean
	cd test/malloc && make clean
	cd test/libc-archive && make clean
	cd test/libpython-so && make clean

.PHONY: clean
