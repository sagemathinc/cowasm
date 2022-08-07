OPT           = #-O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PACKAGES      = ${CWD}/..
export PATH := ${PACKAGES}/../bin:${PACKAGES}/zig/dist:$(PATH)

ZIG_PKG       = --main-pkg-path ${CWD}/src

PYTHON_NATIVE = ${PACKAGES}/cpython/dist/native
PYTHON_WASM   = ${PACKAGES}/cpython/dist/wasm-shared
POSIX_WASM   = ${PACKAGES}/posix-wasm/dist/wasm-shared
DYLINK   = ${PACKAGES}/dylink/dist

WASM_CFLAGS   = -dynamic ${OPT}

TEST = ./test-zig.sh

DIST = ${CWD}/dist

all: ${DIST}/.built bin hello python

# Runs zig test on all zig files that contain the word "test" but do not
# have interface or export in their filename (since can't test those).
.PHONY: test-zig
test-zig:
	cd src && grep -l test *.zig */*.zig | grep -v interface | grep -v export | xargs -t -n 1 ${TEST}

####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I. ${OPT}

# Explanation of options to zig build-lib:
#  - ${OPT} - at the top file can set the release type
#  - -dynamic - put this or get a basically empty python.wasm
#  - -rdynamic - put this so that all the functions in python.wasm are
#    in the instance.exports, which is needed for dynamic linking of
#    extension modules
#  - -target wasm32-wasi - cross compile for webassembly
#  - -lc - c library (needed due to -wasi above)
#  - --import-memory -- so that we specify WebAssembly.Memory, which we
#    can then share between modules (needed for dynamic linking).
#  - -I ...  - directories to look for headers
#  - various .a files - code that gets statically linked in; if something
#    is neeeded but missing here, you get a nasty "Bus Error 10" or something.
#  - ...signal.c - this was easier to write in c than zig, so must be
#    explicitly specified.
#  - python/interface.zig - the zig entry point -- anything this imports
#    also gets compiled, without being explicitly listed here.
#


${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig src/python/signal/signal.c src/python/signal/signal.zig src/python/pyapi.zig
	cd src && zig build-lib \
		${OPT} \
		-rdynamic \
		-target wasm32-wasi \
		--import-memory \
		--import-table \
		-I. -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM} \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
	   `pwd`/python/signal/signal.c \
	   -L ${DYLINK}/wasm/ -ldylink \
	   python/interface.zig -lc -lm
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm

.PHONEY: python
python: ${DIST}/python/python.wasm ${DIST}/python/python.zip ${DIST}/python/libpython.so

${DIST}/python/python.zip: ${PYTHON_WASM}/lib/dist/python311.zip ${DIST}/python/libpython.so
	# Copy over the modules files
	cp ${PYTHON_WASM}/lib/dist/python311.zip ${DIST}/python/python.zip
	# For now we also put libpython.so in the zip file:
	cd ${DIST}/python/ && zip -u python.zip libpython.so

${DIST}/python/libpython.so: ${DYLINK}/wasm/libpython.so
	cp ${DYLINK}/wasm/libpython.so ${DIST}/python/libpython.so

${DIST}/python/hello.cpython-311-wasm32-wasi.so: src/python/extension/hellomodule.c
	zig-fPIC cc src/python/extension/hellomodule.c -c -o ${DIST}/python/hello.o -I${PYTHON_WASM}/include/python3.11
	zig wasm-ld --experimental-pic -shared ${DIST}/python/hello.o -o ${DIST}/python/hello.cpython-311-wasm32-wasi.so
	rm ${DIST}/python/hello.o
	echo "TODO: temporary path hack:"
	cp  ${DIST}/python/hello.cpython-311-wasm32-wasi.so ../cpython/dist/wasm-shared/lib/python3.11/lib-dynload/

.PHONEY: hello
hello: ${DIST}/python/hello.cpython-311-wasm32-wasi.so

##################
## Interface support functionality for WebAssembly.
##   - Proxy Objects
##################

test-proxy:
	cd src && ${TEST} interface/proxy.zig

## Node modules
node_modules:
	npm ci

.PHONY: bin
bin:
	ln -sf ${CWD}/bin/python-wasm ${CWD}/../../bin/python-wasm
	ln -sf ${CWD}/bin/python-wasm-debug ${CWD}/../../bin/python-wasm-debug

## Put it all together

${DIST}/.built: node_modules ${DIST}/python/python.wasm
	npx tsc
	touch ${DIST}/.built

# Run all test suites: (1) the Native zig test suite; (2) the Javascript test suite.
# This exercise zig-related code both via a native build, and then via the separate WebAssembly build.
.PHONY: test
test: all test-zig
	npm run test

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache


# Obviously this can't work without a dylink runtime setup.
# packages/dylink/test/libpython-so/app.js could help.
test-python1:
	cd src && ${TEST} python/python1.zig -I. ${OPT}


