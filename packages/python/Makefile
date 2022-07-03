# See https://www.python.org/downloads/
PYTHON_VERSION = 3.11.0
BETA = b3

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm
ZLIB = ${CWD}/../zlib/dist
LZMA = ${CWD}/../lzma/dist
WASMPOSIX = ${CWD}/../wasm-posix/dist
ARCH = x86_64-pc-linux-gnux32

# On Linux it is "python", but on MacOS it is "python.exe".
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
PYTHON_EXE = python.exe
else
PYTHON_EXE = python
endif

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
	cd ${BUILD} && curl https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}${BETA}.tar.xz -o Python-${PYTHON_VERSION}.tar.xz

.PHONY: source
source: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz

#############
# NATIVE
#############

${BUILD}/native/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf Python-${PYTHON_VERSION}.tar.xz -C native --strip-components=1
	# We only use the 0008-setup.patch patch, which is *maybe* needed to get module building
	# to work when compiling with zig...
	cd ${BUILD}/native && cat ${CWD}/src/python-patches/0008-setup.patch | patch -p1
	cd ${BUILD}/native && cat ${CWD}/src/python-patches/0009-threading-native.patch | patch -p1
	touch ${BUILD}/native/.patched

# Possibly doesn't work due to https://stackoverflow.com/questions/63629878/dyld-library-path-environment-variable-is-not-forwarded-to-external-command-in-m
${DIST_NATIVE}/.built: export LD_LIBRARY_PATH:=${ZLIB}/native/lib:${LZMA}/native/lib:${BUILD}/native
${DIST_NATIVE}/.built: export DYLD_LIBRARY_PATH:=${ZLIB}/native/lib:${LZMA}/native/lib:${BUILD}/native
${DIST_NATIVE}/.built: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		CFLAGS="-I${ZLIB}/native/include -I${LZMA}/native/include" \
		LDFLAGS="-L${ZLIB}/native/lib -L${LZMA}/native/lib" \
		AR="zig ar" \
		CXX="zig c++ --target=x86_64-linux-gnu.2.28" \
		CC="zig cc --target=x86_64-linux-gnu.2.28" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-shared
	cd ${BUILD}/native && make || true; make   # it breaks once due to threading.py, but second time works ?
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	DYLD_LIBRARY_PATH=${DIST_NATIVE}/lib LD_LIBRARY_PATH=${DIST_NATIVE}/lib ${DIST_NATIVE}/bin/python3

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
	## cd ${BUILD}/wasm && cat ${CWD}/src/python-patches/*.patch | patch -p1
	## # Some legacy code assumes this setjmp.h header exists.  Not actually
	## # used at all in Python, fortunately!
	## cd ${BUILD}/wasm && mkdir -p bits && echo "#define __jmp_buf int" > bits/setjmp.h
	touch ${BUILD}/wasm/.patched

${DIST_WASM}/.built: export LD_LIBRARY_PATH:=${DIST_NATIVE}/lib:"${LD_LIBRARY_PATH}"
${DIST_WASM}/.built: export DYLD_LIBRARY_PATH:=${DIST_NATIVE}/lib:"${DYLD_LIBRARY_PATH}"
${DIST_WASM}/.built: export PATH:=${DIST_NATIVE}/bin:"${PATH}"
${DIST_WASM}/.built: ${BUILD}/wasm/.patched ${BUILD}/native/.patched
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - without-pymalloc below because pymalloc uses mmap and munmap, and WASI/our libc doesn't provide them.
	#   We could try to write them ourselves (?)...
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	cd ${BUILD}/wasm && \
		CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS" \
		CXX="zig c++ -target wasm32-wasi -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS" \
		AR="zig ar" \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib  -L${LZMA}/wasm/lib" \
		CFLAGS="-I${ZLIB}/wasm/include -I${LZMA}/wasm/include" \
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
			--with-build-python=${DIST_NATIVE}/bin/python3 \
			--host=wasm32-unknown-emscripten \
			--build=`./config.guess`
	# Make it so our WASM posix header file is included everywhere,
	# since otherwise we can't even compile.  Must do this AFTER ./configure.
	cd ${BUILD}/wasm && echo '#include "wasm-posix.h"' >> pyconfig.h && cp ${WASMPOSIX}/*.h .
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	# Also copy wasm-posix.h over, so it's possible to build programs against our new python.
	cd ${BUILD}/wasm && cp ${WASMPOSIX}/wasm-posix.h ${DIST_WASM}/include/python3.11/
	# Create a modified Python binary with libwasmposix.a linked in so that it can
	# be run via wasmer on the command line (without node.js!).  We abuse LINKFORSHARED
	# to add our wasmposix to the build line.  TODO: hardcoding "python3.11" :-(
	cd ${BUILD}/wasm && rm ${PYTHON_EXE} && make LINKFORSHARED=${WASMPOSIX}/libwasmposix.a ${PYTHON_EXE} && cp ${PYTHON_EXE} ${DIST_WASM}/bin/python3.11
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


# Use "make run-wasm" to run our WASM python at the command line.
.PHONY: run-wasm
run-wasm: ${DIST_WASM}/.built
	wasmer run ${DIST_WASM}/bin/python3 --mapdir /:/


# Cleaning up

clean:
	rm -rf ${BUILD} ${DIST}
