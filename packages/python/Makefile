# See https://www.python.org/downloads/
PYTHON_VERSION = 3.9.7

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
ZLIB = ${CWD}/../zlib/dist
WASMPOSIX = ${CWD}/../wasm-posix/dist

# Default target
.PHONY: all
all: ${CWD}/dist/.built

${CWD}/dist/.built: native wasm
	touch ${CWD}/dist/.built

#############
# Source code
#############
${BUILD}/Python-${PYTHON_VERSION}.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz -o Python-${PYTHON_VERSION}.tar.xz

.PHONY: source
source: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz

#############
# NATIVE
#############

${BUILD}/native/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf Python-${PYTHON_VERSION}.tar.xz -C native --strip-components=1
	# We only use the 0008-setup.patch patch, which is needed to get module building
	# to work when compiling with zig, I think due to having to explicitly build gnu libc 2.28,
	# which is to work around another issue with Zig...
	cd ${BUILD}/native && cat ${CWD}/src/python-patches/0008-setup.patch | patch -p1
	touch ${BUILD}/native/.patched

${DIST_NATIVE}/.built: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		LD_LIBRARY_PATH=${ZLIB}/native/lib \
		CFLAGS=-I${ZLIB}/native/include \
		LDFLAGS=-L${ZLIB}/native/lib \
		AR="zig ar" \
		CXX="zig c++ -target native-native-gnu.2.28" \
		CC="zig cc -target native-native-gnu.2.28" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-shared
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	LD_LIBRARY_PATH=${DIST_NATIVE}/lib ${DIST_NATIVE}/bin/python3

#############
# WASM
#############

${BUILD}/wasm/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf Python-${PYTHON_VERSION}.tar.xz -C wasm --strip-components=1 \
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	cp src/config.site ${BUILD}/wasm
	# Apply all the patches to the code to make it WASM friendly.
	# These patches initially come from pyodide.  They add a WASM cross compilation target
	# to the config scripts (should that get upstreamed to Python?).
	cd ${BUILD}/wasm && cat ${CWD}/src/python-patches/*.patch | patch -p1
	# Some legacy code assumes this setjmp.h header exists.  Not actually
	# used at all in Python, fortunately!
	cd ${BUILD}/wasm && mkdir -p bits && echo "#define __jmp_buf int" > bits/setjmp.h
	touch ${BUILD}/wasm/.patched

${DIST_WASM}/.built: ${BUILD}/wasm/.patched
	# Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# without-pymalloc below because pymalloc uses mmap and munmap, and WASI/our libc doesn't provide them.
	# We could try to write them ourselves (?)...
	cd ${BUILD}/wasm && \
		CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS" \
		CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS" \
		AR="zig ar" \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib" \
		CFLAGS="-I${ZLIB}/wasm/include" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--prefix=${DIST_WASM}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--disable-shared \
			--disable-ipv6 \
			--without-pymalloc \
			--with-ensurepip=no \
			--host=wasm32-unknown-emscripten \
			--build=`./config.guess`
	# Make it so our WASM posix header file is included everywhere,
	# since otherwise we can't even compile.  Must do this AFTER ./configure.
	cd ${BUILD}/wasm && echo '#include "wasm-posix.h"' >> pyconfig.h && cp ${WASMPOSIX}/wasm-posix.h .
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	# Also copy wasm-posix.h over, so it's possible to build programs against our new python.
	cd ${BUILD}/wasm && cp ${WASMPOSIX}/wasm-posix.h ${DIST_WASM}/include/python3.9/
	# Create a modified Python binary with libwasmposix.a linked in so that it can
	# be run via wasmer on the command line (without node.js!).  We abuse LINKFORSHARED
	# to add our wasmposix to the build line.  TODO: hardcoding "python3.9" :-(
	cd ${BUILD}/wasm && rm python && make LINKFORSHARED=${WASMPOSIX}/libwasmposix.a python && cp python ${DIST_WASM}/bin/python3.9
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


# Use "make run-wasm" to run our WASM python at the command line.
.PHONY: run-wasm
run-wasm: ${DIST_WASM}/.built
	wasmer run ${DIST_WASM}/bin/python3 --mapdir /:/


# Cleaning up

clean:
	rm -rf ${BUILD}

clean-all: clean
	rm -rf ${DIST_NATIVE} ${DIST_WASM}
