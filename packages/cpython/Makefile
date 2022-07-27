#
# We build a native version of CPython and a WASM version.
# The native version is ONLY used as part of the cross compilation build process
# and not used for anything else.  TODO: Currently, we can't build native Python using
# only zig on our supported architectures, so we use the native toolchain, which is
# really annoying and makes bootstraping a build a little harder.
#


# See https://www.python.org/downloads/
PYTHON_MAJOR = 3
PYTHON_MINOR = 11
PYTHON_PATCH = 0
PYTHON_BETA = b4
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm
ZLIB = ${CWD}/../zlib/dist
LZMA = ${CWD}/../lzma/dist
LIBEDIT = ${CWD}/../libedit/dist
SQLITE = ${CWD}/../sqlite/dist
WASMPOSIX = ${CWD}/../wasm-posix/dist

NCURSES = ${CWD}/../ncurses/dist
NCURSES_INCLUDE = -I${NCURSES}/wasm/include/ncurses -I${NCURSES}/wasm/include
NCURSES_LIB = -L${NCURSES}/wasm/lib

PYTHON_WASM_BINARY = ${CWD}/../../bin/python-wasm

# We only use zlib (not lzma) for native build, since liblzma widely available natively.

export DYLD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export LD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export PATH := ${DIST_NATIVE}/bin:${PATH}

# Default target
.PHONY: all
all: ${CWD}/dist/.built

${CWD}/dist/.built: native wasm-data
	touch ${CWD}/dist/.built

#############
# Source code
#############
${BUILD}/Python-${PYTHON_VERSION}.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}${PYTHON_BETA}.tar.xz -o Python-${PYTHON_VERSION}.tar.xz

.PHONY: source
source: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz

#############
# NATIVE
# Note that despite the word "patched" below, we apply NO patches to the native build.
#############

${BUILD}/native/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf Python-${PYTHON_VERSION}.tar.xz -C native --strip-components=1
	touch ${BUILD}/native/.patched

# I would love to use the zig build of native Python, but it just doesn't work yet.
# Instead we build with whatever native tools are installed (see below)

${DIST_NATIVE}/.built-zig: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		AR="zig ar" \
		CXX="zig c++" \
		CC="zig cc" \
		CFLAGS="-I${ZLIB}/native/include" \
		LDFLAGS="-L${ZLIB}/native/lib" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--enable-shared \
			--with-ensurepip=no
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses zlib).  This is to workaround
	# a security feature of MacOS (see https://developer.apple.com/forums/thread/9233). For simplicity we set this everywhere.
	cd ${BUILD}/native && make  -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}"
	cd ${BUILD}/native && make  -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}" install
	touch ${DIST_NATIVE}/.built
	touch ${DIST_NATIVE}/.built-zig

.PHONY: native-zig
native-zig: ${DIST_NATIVE}/.built-zig


${DIST_NATIVE}/.built-default: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		CFLAGS="-I${ZLIB}/native/include" \
		LDFLAGS="-L${ZLIB}/native/lib" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--with-ensurepip=no
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses zlib).  This is to workaround
	# a security feature of MacOS (see https://developer.apple.com/forums/thread/9233). For simplicity we set this everywhere.
	cd ${BUILD}/native && make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}"
	cd ${BUILD}/native && make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}" install
	touch ${DIST_NATIVE}/.built
	touch ${DIST_NATIVE}/.built-default

.PHONY: native-default
native-default: ${DIST_NATIVE}/.built-default

# This doesn't use zig.
.PHONY: native
native: ${DIST_NATIVE}/.built-default

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	${DIST_NATIVE}/bin/python3

#############
# WASM
#############

${BUILD}/wasm/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf Python-${PYTHON_VERSION}.tar.xz -C wasm --strip-components=1 \
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	cp src/rebuild ${BUILD}/wasm
	cp src/config.site ${BUILD}/wasm
	cp src/Setup.local ${BUILD}/wasm/Modules
	cp ${WASMPOSIX}/*.h ${BUILD}/wasm
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to wasm-posix.h
	mkdir ${BUILD}/wasm/sys && echo '#include "wasm-posix.h"' >  ${BUILD}/wasm/sys/wait.h
	cd ${BUILD}/wasm/Include/internal && cat ${CWD}/src/python-patches/01-emscripten-signal.patch | patch -p0
	cd ${BUILD}/wasm/Lib && cat ${CWD}/src/python-patches/02-pydoc.patch | patch -p0
	cd ${BUILD}/wasm/Tools/wasm/ && cat ${CWD}/src/python-patches/03-wasm-assets.patch | patch -p0
	touch ${BUILD}/wasm/.patched

${DIST_WASM}/.built-cpython: ${BUILD}/wasm/.patched ${DIST_NATIVE}/.built
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - without-pymalloc below because pymalloc uses mmap and munmap, and WASI/our libc doesn't provide them.
	#   We could try to write them ourselves (?)...
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	# - We use -I (path to source) in the CC/CXX line in addition to CFLAGS so that we can override some
	#   bad global libraries, e.g., systemwide (zig musl) sys/wait.h with a local version.
	# - BLDSHARED is needed indirectly for wasm_assets.py to work (maybe).
	cd ${BUILD}/wasm && \
		CC="zig cc -Oz -target wasm32-wasi  " \
		CXX="zig c++ -target wasm32-wasi " \
		BLDSHARED="zig cc -Oz -target wasm32-wasi -shared" \
		AR="zig ar" \
		CFLAGS=" -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -I${BUILD}/wasm/ -I${ZLIB}/wasm/include  -I${LZMA}/wasm/include -I${LIBEDIT}/wasm/include  -I${SQLITE}/wasm/include  ${NCURSES_INCLUDE}" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--prefix=${DIST_WASM}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--disable-shared \
			--disable-ipv6 \
			--with-readline=editline \
			--with-build-python=${DIST_NATIVE}/bin/python3 \
			--without-pymalloc \
			--without-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	# Make it so our WASM posix header file is included everywhere,
	# since otherwise we can't even compile.  Must do this AFTER ./configure.
	cd ${BUILD}/wasm && echo '#include "wasm-posix.h"' >> pyconfig.h
	cd ${BUILD}/wasm && echo '#undef HAVE_LINUX_VM_SOCKETS_H' >> pyconfig.h
	cd ${BUILD}/wasm && echo '#define POLLPRI 0' >> pyconfig.h
	cd ${BUILD}/wasm && echo '#define __WASM__ 1' >> pyconfig.h
	cd ${BUILD}/wasm && echo '#undef GETPGRP_HAVE_ARG' >> pyconfig.h
	cd ${BUILD}/wasm && make -j8
	# These are missing, breaking the "make install".  Why? TODO!
	cd ${BUILD}/wasm && touch Modules/_testimportmultiple.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/_testmultiphase.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited_35.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so
	cd ${BUILD}/wasm && make install
	# Also copy wasm-posix.h over, so it's possible to build programs against our new python.
	cd ${BUILD}/wasm && cp ${WASMPOSIX}/wasm-posix.h ${DIST_WASM}/include/python${PYTHON_MAJOR}.${PYTHON_MINOR}/
	touch ${DIST_WASM}/.built-cpython

.PHONY: wasm
wasm: ${DIST_WASM}/.built-cpython


${DIST_WASM}/lib/dist/python311.zip: ${DIST_NATIVE}/.built ${DIST_WASM}/.built-cpython
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD}/wasm && \
		mkdir -p usr/local/lib/python3.11/lib-dynload/  && \
	    DYLD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" python3 ./Tools/wasm/wasm_assets.py && \
		rm -rf ${DIST_WASM}/lib/dist && \
		mv usr/local/lib ${DIST_WASM}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp src/termcap ${DIST_WASM}/lib/dist/termcap && cd ${DIST_WASM}/lib/dist/ && zip -u python311.zip termcap
	touch ${DIST_WASM}/.built

.PHONY: wasm-data
wasm-data: ${DIST_WASM}/lib/dist/python311.zip

# Use "make run-wasm" to run our WASM python at the command line.
# You can also just run `python-wasm` in the top level bin/ directory.
.PHONY: run-wasm
run-wasm: ${DIST_WASM}/.built
	${PYTHON_WASM_BINARY}

# Run the cpython test suite under WASM python.
# TODO: excluding test_lzma.py and test_queue.py right now, since they hangs forever.
# TODO: we should really use the official python test runner stuff, but that requires
# implementing a restricted version of fork, which is possible (as we're using node.js).
# This should be run via  'python-wasm -m test -w' basically as is illustrated here
#     https://speakerdeck.com/tiran/language-summit-2022-webassembly-python-in-the-browser-and-beyond?slide=14
# and our goal should be to have it all pass!
# But first we need to get all the modules to actually build, since many of the tests depend
# on them being built.  The code below helps a little to see where we are at.
.PHONY: test-wasm
test-wasm:
	cd ${BUILD}/wasm/Lib/test && ls -d `pwd`/test_*.py | grep -v test_lzma.py | grep -v  test_queue.py | xargs -t -n 1 ${PYTHON_WASM_BINARY} 2>&1 | tee ${BUILD}/wasm/test.out && \
	grep FAIL ${BUILD}/wasm/test.out
	echo "See ${BUILD}/wasm/test.out"


# Cleaning up

clean:
	rm -rf ${BUILD} ${DIST}
