include ../build/Makefile-vars

# OPT     = -O ReleaseFast
# OPT     = -O ReleaseSafe
# OPT     = -O ReleaseSmall
OPT     = -O Debug
ZIG_PKG = --main-pkg-path ${SRC}

PYTHON_NATIVE = ${PACKAGES}/cpython/dist/native
PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
DYLINK = ${PACKAGES}/dylink/dist
DASH = ${PACKAGES}/dash/dist/wasm
LIBGIT2 = ${PACKAGES}/libgit2/dist/wasm
ZLIB = ${PACKAGES}/zlib/dist/wasm
NCURSES = ${PACKAGES}/ncurses/dist/wasm
LIBEDIT = ${PACKAGES}/libedit/dist/wasm
TERMCAP = ${PACKAGES}/termcap/dist/wasm

WASI_EMULATED = -lwasi-emulated-mman -lwasi-emulated-process-clocks -lwasi-emulated-signal
WASM_CFLAGS   = -D_WASI_EMULATED_SIGNAL  -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_PROCESS_CLOCKS -dynamic ${OPT}

TEST = ./test-zig.sh

all: ${DIST}/.built bin hello python dash bin-dash

include ../build/Makefile-rules

####################
## Python interface
####################

test-python:
	cd src && ${TEST} python/python.zig -I.  ${OPT}

test-posix:
	cd src && \
		${TEST} wasm/posix/unistd.zig   ${OPT} && \
		${TEST} wasm/posix/stdio.zig   ${OPT} && \
		${TEST} wasm/posix/string.zig   ${OPT} && \
		${TEST} wasm/posix/stdlib.zig wasm/posix/stdlib.c  ${OPT}

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
#  - src/python/signal/signal.c - this was easier to write in c than zig, so must be
#    explicitly specified.
#  - python/interface.zig - the zig entry point -- anything this imports
#    also gets compiled, without being explicitly listed here.
#

POSIX_SOURCES = \
	${POSIX_WASM}/libposix.a \
	src/wasm/posix.zig \
	src/wasm/posix/stdlib.c \
	$(shell find src/wasm/posix/*.zig -type f) $(shell find src/python/*.zig -type f)


PYTHON_WASM_C = ${PYTHON_WASM}/lib/libpython3.11.a \
		${DYLINK}/wasm-export/libpython.c \
		${POSIX_WASM}/libposix.a \
		${CWD}/src/python/signal/signal.c \
		${CWD}/src/wasm/posix/stdlib.c

PYTHON_WASM_SOURCES = \
	src/python/signal/signal.c src/wasm/posix/stdlib.c \
	${DYLINK}/wasm/libdylink.a \
	${POSIX_SOURCES} \
	${PYTHON_WASM_C}

PYTHON_WASM_INCLUDE = -I. -I${POSIX_WASM} -I${PYTHON_WASM}/include/python3.11 -I${LIBGIT2}/include

PYTHON_WASM_LIBS = -L ${DYLINK}/wasm/ -ldylink -lc -lm ${WASI_EMULATED} -lgit2 -L${LIBGIT2}/lib -lz -L${ZLIB}/lib

# Regarding --stack below, I reported this upstream: https://github.com/ziglang/zig/issues/3735#issuecomment-1223574526
${DIST}/python/python.wasm: ${PYTHON_WASM_SOURCES} ${LIBGIT2}/lib/libgit2.a ${ZLIB}/lib/libz.a
	cd src && zig build-lib \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
		-rdynamic \
		--stack 1048576 \
		-target wasm32-wasi \
		--import-memory --import-table \
		${PYTHON_WASM_LIBS} \
		${PYTHON_WASM_INCLUDE} \
		${PYTHON_WASM_C} \
		python/interface.zig
	mkdir -p ${DIST}/python
	mv src/interface.wasm ${DIST}/python/python.wasm

DATAFILES = ${DIST}/python/python-minimal.zip ${DIST}/python/python-readline.zip ${DIST}/python/python-stdlib.zip

${DIST}/python/%.zip: ${PYTHON_WASM}/lib/dist/%.zip
	# Copy over the modules file
	mkdir -p ${DIST}/python/  # without this "make -j4" breaks.
	cp $< $@


${DIST}/termcap: ${PYTHON_WASM}/lib/dist/termcap
	# Copy over the termcap file (termcap is also in python.zip, but it's useful to have outside for debug mode).
	cp ${PYTHON_WASM}/lib/dist/termcap ${DIST}/termcap

.PHONY: python
python: ${DIST}/python/python.wasm ${DATAFILES} ${PYTHON_PACKAGES} ${DIST}/termcap

# ${DIST}/python/py/%.tar.xz: ${PACKAGES}/py-%/dist/wasm/%.tar.xz
# 	mkdir -p ${DIST}/python/py
# 	cp -v $< ${DIST}/python/py

.PHONY: packages
packages:
	rm -rf ${DIST}/python/py
	mkdir -p ${DIST}/python/py
	ln -sf ${PACKAGES}/py-*/dist/wasm/*.tar.xz ${DIST}/python/py

${DIST}/python/hello.cpython-311-wasm32-wasi.so: src/python/extension/hellomodule.c
	zig-fPIC cc src/python/extension/hellomodule.c -c -o ${DIST}/python/hello.o -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM}
	zig wasm-ld --experimental-pic -shared ${DIST}/python/hello.o -o ${DIST}/python/hello.cpython-311-wasm32-wasi.so
	rm ${DIST}/python/hello.o

# TODO: temporary path hack:
${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.cpython-311-wasm32-wasi.so: ${DIST}/python/hello.cpython-311-wasm32-wasi.so
	cp  ${DIST}/python/hello.cpython-311-wasm32-wasi.so ${PYTHON_WASM}/lib/python3.11/lib-dynload/

.PHONEY: hello
hello: ${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.cpython-311-wasm32-wasi.so

## Node modules
node_modules:
	npm ci

${CWD}/../../bin/zython: ${CWD}/bin/zython
	ln -sf ${CWD}/bin/zython ${CWD}/../../bin/zython

${CWD}/../../bin/zython-debug: ${CWD}/bin/zython-debug
	ln -sf ${CWD}/bin/zython-debug ${CWD}/../../bin/zython-debug

${CWD}/../../bin/zython-dev: ${CWD}/bin/zython-dev
	ln -sf ${CWD}/bin/zython-dev ${CWD}/../../bin/zython-dev

.PHONY: bin
bin: ${CWD}/../../bin/zython ${CWD}/../../bin/zython-debug ${CWD}/../../bin/zython-dev

## Put it all together

${DIST}/.built: node_modules ${DIST}/python/python.wasm
	npx tsc
	touch ${DIST}/.built

# Run all test suites: (1) the Native zig test suite; (2) the Javascript test suite.
# This exercise zig-related code both via a native build, and then via the separate WebAssembly build.
.PHONY: test
test: all #test-python test-posix
	npm run test

strip: node_modules
	npm run strip


# This is just here to see if this is possible and how much is common before
# refactoring the code and putting this in a completely different package.

# Dash

DASH_WASM_SOURCES = \
	${POSIX_SOURCES} \
	src/dash/interface.zig \
	src/dash/dash.zig

DASH_WASM_LDFLAGS = -L ${DYLINK}/wasm/ -ldylink -lc -lm ${WASI_EMULATED}

DASH_WASM_INCLUDE = -I. -I${POSIX_WASM}

DASH_WASM_C = ${DASH}/lib/libdash.a \
		${POSIX_WASM}/libposix.a \
		${LIBEDIT}/lib/libedit.a \
		${TERMCAP}/lib/libtermcap.a \
		${CWD}/src/wasm/posix/stdlib.c \
		${CWD}/src/python/signal/signal.c

${DIST}/dash/dash.wasm: ${DASH_WASM_SOURCES} ${DASH_WASM_C}
	cd src && zig build-lib \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
		-rdynamic \
		--stack 1048576 \
		-target wasm32-wasi \
		--import-memory --import-table \
		${DASH_WASM_LDFLAGS} \
		${DASH_WASM_INCLUDE} \
		${DASH_WASM_C} \
		dash/interface.zig
	mkdir -p ${DIST}/dash
	mv src/interface.wasm ${DIST}/dash/dash.wasm

.PHONY: dash
dash: ${DIST}/dash/dash.wasm

${CWD}/../../bin/zash: ${CWD}/bin/zash
	ln -sf ${CWD}/bin/zash ${CWD}/../../bin/zash

${CWD}/../../bin/zash-debug: ${CWD}/bin/zash-debug
	ln -sf ${CWD}/bin/zash-debug ${CWD}/../../bin/zash-debug

.PHONY: bin-dash
bin-dash: ${CWD}/../../bin/zash ${CWD}/../../bin/zash-debug


# Core

CORE_WASM_LDFLAGS = ${WASI_EMULATED} -lc -L ${DYLINK}/wasm/ -ldylink
CORE_WASM_INCLUDE = -I. -I${POSIX_WASM}

CORE_WASM_C = \
		${POSIX_WASM}/libposix.a \
		${CWD}/src/wasm/posix/stdlib.c \
		${CWD}/src/python/signal/signal.c

${DIST}/core/libcore.a: ${POSIX_SOURCES} ${CORE_WASM_C} ${CWD}/src/wasm/core.zig
	cd src && zig build-lib \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
		-rdynamic \
		--stack 1048576 \
		-target wasm32-wasi \
		${CORE_WASM_LDFLAGS} \
		${CORE_WASM_INCLUDE} \
		${CORE_WASM_C} \
		${CWD}/src/wasm/core.zig
