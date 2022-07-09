# See https://www.python.org/downloads/
PYTHON_MAJOR = 3
PYTHON_MINOR = 11
PYTHON_PATCH = 0
PYTHON_BETA = b3
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm
ZLIB = ${CWD}/../zlib/dist
LZMA = ${CWD}/../lzma/dist
WASMPOSIX = ${CWD}/../wasm-posix/dist

export DYLD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib:${LZMA}/native/lib:${DYLD_LIBRARY_PATH}
export LD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib:${LZMA}/native/lib:${LD_LIBRARY_PATH}
export PATH := ${DIST_NATIVE}/bin:${PATH}

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
	# - We use the 0008-setup.patch patch, which is *maybe* needed to get module building
	#   to work when compiling with zig.
	# - 0009-threading-native.patch  is just a horrible hack to sort of get around something
	#   broken also involving building with zig (?). This was only needed when using zig:
	# cd ${BUILD}/native && cat ${CWD}/src/python-patches/0009-threading-native.patch | patch -p1
	touch ${BUILD}/native/.patched

# NOTE: We are using the system-wide GCC instead of zig to
# build the native version, since it actually works on more
# platforms more robustly.  That said, it is MASSIVELY slower.
# To switch back to zig, try replacing what is below
# by this.  This works for me on cocalc, but not a clean docker
# image or aarch64 docker linux.  Also, make sure to enable the
# 0009-threading-native.patch patch elsewhere (in two places).
#
# UNAME_S := $(shell uname -s)
# UNAME_P := $(shell uname -p)
# ifeq ($(UNAME_S),Linux)
#    # Workaround a zig bug -- the native build fails with "ld.lld: error: undefined symbol: fcntl64".
#    # See https://github.com/ziglang/zig/issues/5882 and https://github.com/ziglang/zig/issues/9485
#    ARCH = --target=$(UNAME_P)-linux-gnu.2.31
# endif
#
# Below:
# 		CFLAGS="-I${ZLIB}/native/include -I/usr/include" \
# 		LDFLAGS="-L${ZLIB}/native/lib" \
# 		AR="zig ar" \
# 		CXX="zig c++ ${ARCH}" \
# 		CC="zig cc ${ARCH}" \

${DIST_NATIVE}/.built: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		CFLAGS="-I${ZLIB}/native/include -I${LZMA}/native/include" \
		LDFLAGS="-L${ZLIB}/native/lib -L${LZMA}/native/lib" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-shared
	cd ${BUILD}/native && make -j8 || true; make # TODO: it breaks once; second time works
	cd ${BUILD}/native && make install || true   # TODO: fails, but seems good enough for now (failure is with zipfile, but we don't pip install anything)
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	${DIST_NATIVE}/bin/python3

#############
# WASM
# Note that despite the word "patched" below, we also apply NO patches to the Python sources at that point
# to do the WASM Build!
# We do make a few small changes to pyconfig.h after it is generated.
#############

${BUILD}/wasm/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf Python-${PYTHON_VERSION}.tar.xz -C wasm --strip-components=1 \
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	cp src/config.site ${BUILD}/wasm
	# Ooly need for native build using Zig:
	# cd ${BUILD}/wasm && cat ${CWD}/src/python-patches/0009-threading-native.patch | patch -p1
	touch ${BUILD}/wasm/.patched

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
		CFLAGS="-I${ZLIB}/wasm/include  -I${LZMA}/wasm/include" \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib -L${LZMA}/wasm/lib" \
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
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	# Make it so our WASM posix header file is included everywhere,
	# since otherwise we can't even compile.  Must do this AFTER ./configure.
	cd ${BUILD}/wasm && echo '#include "wasm-posix.h"' >> pyconfig.h && cp ${WASMPOSIX}/*.h .
	cd ${BUILD}/wasm && echo '#undef HAVE_LINUX_VM_SOCKETS_H' >> pyconfig.h
	cd ${BUILD}/wasm && echo '#define POLLPRI 0' >> pyconfig.h
	cd ${BUILD}/wasm && make -j8
	# These are missing, breaking the "make install".  Why? TODO!
	cd ${BUILD}/wasm && touch Modules/_testimportmultiple.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/_testmultiphase.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited_35.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so
	cd ${BUILD}/wasm && make install
	# Also copy wasm-posix.h over, so it's possible to build programs against our new python.
	cd ${BUILD}/wasm && cp ${WASMPOSIX}/wasm-posix.h ${DIST_WASM}/include/python${PYTHON_MAJOR}.${PYTHON_MINOR}/
	# Build wasm asset bundle (the pyc files, etc.).  TODO/HACK: We make some symlinks to avoid having to patch wasm_assets.py
	# though it would be very reasonable to contribute a change upstream to make the script not need this hack.
	cd ${BUILD}/wasm/build/ && ln -sf lib.wasi-wasm32-${PYTHON_MAJOR}.${PYTHON_MINOR} lib.emscripten-wasm32-${PYTHON_MAJOR}.${PYTHON_MINOR} && \
		cd lib.emscripten-wasm32-${PYTHON_MAJOR}.${PYTHON_MINOR} && ln -sf _sysconfigdata__wasi_wasm32-wasi.py _sysconfigdata__emscripten_wasm32-emscripten.py
	cd ${BUILD}/wasm && python3 ./Tools/wasm/wasm_assets.py && rm -rf ${DIST_WASM}/lib && mv usr/local/lib ${DIST_WASM}
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
