OPT           = #-O ReleaseFast
CWD           = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PACKAGES      = ${CWD}/..
export PATH := ${PACKAGES}/../bin:${PACKAGES}/zig/dist:$(PATH)

ZIG_PKG       = --main-pkg-path ${CWD}/src

PYTHON_NATIVE = ${PACKAGES}/cpython/dist/native
PYTHON_WASM   = ${PACKAGES}/cpython/dist/wasm
POSIX_WASM   = ${PACKAGES}/posix-wasm/dist/wasm
DYLINK   = ${PACKAGES}/dylink/dist
LZMA_WASM = ${CWD}/../lzma/dist/wasm
ZLIB_WASM = ${CWD}/../zlib/dist/wasm
LIBEDIT = ${CWD}/../libedit/dist

WASI_EMULATED = -lwasi-emulated-mman -lwasi-emulated-process-clocks \
		-lwasi-emulated-signal

WASM_CFLAGS   = -dynamic ${OPT}

TEST = ./test-zig.sh ${OPT}

DIST = ${CWD}/dist

all: ${DIST}/.built bin hello python


####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I. ${OPT}

test-posix:
	cd src && \
		${TEST} wasm/posix/unistd.zig && \
		${TEST} wasm/posix/stdio.zig && \
		${TEST} wasm/posix/string.zig

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


${DIST}/python/python.wasm: src/python/python.zig src/python/interface.zig src/python/signal/signal.c src/python/signal/signal.zig src/python/python-shared.zig ${DYLINK}/wasm-export/libpython.c ${DYLINK}/wasm/libdylink.a ${PYTHON_WASM}/lib/libpython3.11.a ${PACKAGES}/lzma/dist/wasm/lib/liblzma.a ${PACKAGES}/zlib/dist/wasm/lib/libz.a ${PACKAGES}/libedit/dist/wasm/lib/libedit.a  ${PACKAGES}/termcap/dist/wasm/lib/libtermcap.a  ${PACKAGES}/cpython/dist/wasm/lib/libmpdec.a ${PACKAGES}/cpython/dist/wasm/lib/libexpat.a ${POSIX_WASM}/libposix.a src/wasm/posix.zig src/wasm/posix/unistd.zig src/wasm/posix/stdio.zig src/wasm/posix/stdlib.zig src/wasm/posix/string.zig src/wasm/posix/termios.zig src/wasm/posix/c-define.zig src/wasm/posix/other.zig
	cd src && zig build-lib \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
		-rdynamic \
		-target wasm32-wasi \
		--import-memory --import-table \
		-I. -I${PYTHON_WASM}/include/python3.11 \
		${PYTHON_WASM}/lib/libpython3.11.a \
	   ${DYLINK}/wasm-export/libpython.c \
		-I${POSIX_WASM} ${POSIX_WASM}/libposix.a \
		${PACKAGES}/lzma/dist/wasm/lib/liblzma.a \
		${PACKAGES}/zlib/dist/wasm/lib/libz.a \
		${PACKAGES}/libedit/dist/wasm/lib/libedit.a \
		${PACKAGES}/termcap/dist/wasm/lib/libtermcap.a \
		${PACKAGES}/cpython/dist/wasm/lib/libmpdec.a \
		${PACKAGES}/cpython/dist/wasm/lib/libexpat.a \
	   -L ${DYLINK}/wasm/ -ldylink \
	   -lc -lm ${WASI_EMULATED} \
	   `pwd`/python/signal/signal.c \
	   python/interface.zig
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm

.PHONEY: python
python: ${DIST}/python/python.wasm ${DIST}/python/python.zip

${DIST}/python/python.zip: ${PYTHON_WASM}/lib/dist/python311.zip
	# Copy over the modules files
	cp ${PYTHON_WASM}/lib/dist/python311.zip ${DIST}/python/python.zip

${DIST}/python/libpython.so: ${DYLINK}/wasm/libpython.so
	cp ${DYLINK}/wasm/libpython.so ${DIST}/python/libpython.so

${DIST}/python/hello.cpython-311-wasm32-wasi.so: src/python/extension/hellomodule.c
	zig-fPIC cc src/python/extension/hellomodule.c -c -o ${DIST}/python/hello.o -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM}
	zig wasm-ld --experimental-pic -shared ${DIST}/python/hello.o -o ${DIST}/python/hello.cpython-311-wasm32-wasi.so
	rm ${DIST}/python/hello.o

# TODO: temporary path hack:
${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.cpython-311-wasm32-wasi.so: ${DIST}/python/hello.cpython-311-wasm32-wasi.so
	cp  ${DIST}/python/hello.cpython-311-wasm32-wasi.so ${PYTHON_WASM}/lib/python3.11/lib-dynload/

.PHONEY: hello
hello: ${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.cpython-311-wasm32-wasi.so

##################
## Interface support functionality for WebAssembly.
##   - Proxy Objects
##################

test-proxy:
	cd src && ${TEST} interface/proxy.zig

## Node modules
node_modules:
	npm ci

${CWD}/../../bin/python-wasm: ${CWD}/bin/python-wasm
	ln -sf ${CWD}/bin/python-wasm ${CWD}/../../bin/python-wasm

${CWD}/../../bin/python-wasm-debug: ${CWD}/bin/python-wasm-debug
	ln -sf ${CWD}/bin/python-wasm-debug ${CWD}/../../bin/python-wasm-debug

.PHONY: bin
bin: ${CWD}/../../bin/python-wasm ${CWD}/../../bin/python-wasm-debug

## Put it all together

${DIST}/.built: node_modules ${DIST}/python/python.wasm
	npx tsc
	touch ${DIST}/.built

# Run all test suites: (1) the Native zig test suite; (2) the Javascript test suite.
# This exercise zig-related code both via a native build, and then via the separate WebAssembly build.
.PHONY: test
test: all test-python test-posix
	npm run test

strip: node_modules
	npm run strip

.PHONY: clean
clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo src/zig-cache src/*/zig-cache



