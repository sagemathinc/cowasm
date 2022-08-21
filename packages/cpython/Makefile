#
# We build a native version of CPython and a WASM version.
# The native version is ONLY used as part of the cross compilation build process
# and not used for anything else.  TODO: Currently, we can't build native Python using
# only zig on our supported architectures, so we use the native toolchain, which is
# really annoying and makes bootstraping a build a little harder.
#
# We only build a *shared* -fPIC version of the WASM version by using our zig-fPIC
# wrapper script, which is in the dylink package.
#
# See https://www.python.org/downloads/
PYTHON_MAJOR = 3
PYTHON_MINOR = 11
PYTHON_PATCH = 0
PYTHON_BETA = rc1
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm
BUILD_WASM = ${BUILD}/wasm
ZLIB = ${CWD}/../zlib/dist
LZMA = ${CWD}/../lzma/dist
LIBEDIT = ${CWD}/../libedit/dist
SQLITE = ${CWD}/../sqlite/dist
POSIX_WASM = ${CWD}/../posix-wasm/dist

NCURSES = ${CWD}/../ncurses/dist
NCURSES_INCLUDE = -I${NCURSES}/wasm/include/ncurses -I${NCURSES}/wasm/include
NCURSES_LIB = -L${NCURSES}/wasm/lib

PYTHON_WASM = ${CWD}/../../bin/python-wasm
PYTHON_WASM_DEBUG = ${CWD}/../../bin/python-wasm-debug

# We only use zlib (not lzma) for native build, since liblzma widely available natively.
export DYLD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export LD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export PATH := ${CWD}/../../bin:${DIST_NATIVE}/bin:${PATH}

# Default target
.PHONY: all
all: ${DIST}/.built

${DIST}/.built: native wasm wasm-data
	touch ${DIST}/.built

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


UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
        UNAME_M := $(shell uname -m)
	# Workaround a zig bug -- the native build fails with "ld.lld: error: undefined symbol: fcntl64".
	# See https://github.com/ziglang/zig/issues/5882 and https://github.com/ziglang/zig/issues/9485
	# NOTE: we use musl instead of gnu.2.31, since musl works on CoCalc (a massive messy huge Linux
	# environment), wheras gnu.2.31 only worked on several minimal linux envs.
	ARCH = --target=$(UNAME_M)-linux-musl
else
	ARCH =
endif

${BUILD}/native/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf Python-${PYTHON_VERSION}.tar.xz -C native --strip-components=1
	cp src/Setup.local-native ${BUILD}/native/Modules/Setup.local
	touch ${BUILD}/native/.patched

${DIST_NATIVE}/.built: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		AR="zig ar" \
		CXX="zig c++ ${ARCH} " \
		CC="zig cc ${ARCH} " \
		CFLAGS="-I${ZLIB}/native/include -I${LIBEDIT}/native/include" \
		LDFLAGS="-L${ZLIB}/native/lib -L${LIBEDIT}/native/lib" \
		./configure \
			--prefix=${DIST_NATIVE} \
			--with-ensurepip=no \
			--with-readline=editline \
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses zlib).  This is to workaround
	# a security feature of MacOS (see https://developer.apple.com/forums/thread/9233). For simplicity we set this everywhere.
	cd ${BUILD}/native && make  -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}"
	cd ${BUILD}/native && make  -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD}/native:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD}/native:${LD_LIBRARY_PATH}" install
	touch ${DIST_NATIVE}/.built

native: ${DIST_NATIVE}/.built

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	${DIST_NATIVE}/bin/python3




#############
# WASM
#############

${BUILD_WASM}/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD_WASM} && mkdir -p ${BUILD_WASM}
	tar xf ${BUILD}/Python-${PYTHON_VERSION}.tar.xz -C ${BUILD_WASM} --strip-components=1
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	ln -s ${CWD}/src/rebuild ${BUILD_WASM}/rebuild
	ln -s ${CWD}/src/rebuild-shared ${BUILD_WASM}/rebuild-shared
	cp src/config.site ${BUILD_WASM}
	cp src/Setup.local ${BUILD_WASM}/Modules/Setup.local
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to posix-wasm.h
	mkdir ${BUILD_WASM}/sys && echo '#include "posix-wasm.h"' >  ${BUILD_WASM}/sys/wait.h
	cd ${BUILD_WASM} && cat ${CWD}/src/python-patches/01-subprocess.patch | patch -p1
	cd ${BUILD_WASM}/Lib && cat ${CWD}/src/python-patches/02-pydoc.patch | patch -p0
	cd ${BUILD_WASM}/Tools/wasm/ && cat ${CWD}/src/python-patches/03-wasm-assets.patch | patch -p0
	touch ${BUILD_WASM}/.patched

# The options for the extension modules.  We cannot strip later. The -s option to BLDSHARED
# below strips debug symbols from the shared object libraries for extension modules,
# as explained here:
#     https://stackoverflow.com/questions/6085491/gcc-vs-clang-symbol-stripping
# It would be nicer to build them with the symbols in (the default), then use wasm-strip
# later when packaging things up.  Unfortunately, wasm-strip only implements "strip everything",
# not just debug symbols.  There's code here  https://reviews.llvm.org/D73820 for the general
# case, but I guess it isn't merged.
# NOTE: if you're debugging, do
#    cd build/wasm
#    ./rebuild-shared
# to rebuild the shared modules. This always builds them with debugging symbols.
BLDSHARED_DEBUG = zig wasm-ld --experimental-pic -shared
BLDSHARED_PROD = ${BLDSHARED_DEBUG}  -s
# what we will use:
BLDSHARED = ${BLDSHARED_PROD}

${DIST_WASM}/.built-cpython: ${BUILD_WASM}/.patched ${DIST_NATIVE}/.built
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - with-pymalloc it actually works and seems faster
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	# - We use -I (path to source) in the CC/CXX line in addition to CFLAGS so that we can override some
	#   bad global libraries, e.g., systemwide (zig musl) sys/wait.h with a local version.
	# - In Python source they lower the default recursion limit; however, we don't need that since our
	#   runtime is Chromium, not wasitime and we can handle huge limits (see Include/internal/pycore_ceval.h).
	# - enable-ipv6, since I put a lot of work into this for posix-zig!
	# --with-pkg-config=no, this is CRITICAL; otherwise, if pkg-config is installed, then python's build system
	#   will use it and pick up system-wide libraries that are not supported by WASM, which is a huge pain
	#   that leads to subtle bugs.  One example of this is "uuid". (TODO: bug report: should be disabled when cross compiling?)
	cd ${BUILD_WASM} && \
		CC="zig cc -Oz -target wasm32-wasi  " \
		CXX="zig c++ -Oz -target wasm32-wasi " \
		AR="zig ar" \
		CFLAGS="-D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -I${BUILD_WASM} -I${ZLIB}/wasm/include  -I${LZMA}/wasm/include -I${LIBEDIT}/wasm/include ${NCURSES_INCLUDE} -I${POSIX_WASM}/wasm -DPy_DEFAULT_RECURSION_LIMIT=1000" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--config-cache \
			--prefix=${DIST_WASM}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-ipv6 \
			--disable-shared \
			--with-pkg-config=no \
			--with-readline=editline \
			--with-build-python=${DIST_NATIVE}/bin/python3 \
			--with-pymalloc \
			--without-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	cat src/pyconfig.h >> ${BUILD_WASM}/pyconfig.h
	# Do not do this build in parallel (-j8), as it WILL fail with "error: unable to build WASI libc CRT file: FileNotFound "
	cd ${BUILD_WASM} && make
	# Now build the shared extension modules, which requires some deep trickiery with zig/clang/wasm-ld via the zig-fPIC script.
	# First remove everything that needs to be built -fPIC or build will fail; add more here as we support more modules.
	cd ${BUILD_WASM}/Modules && find . -name "*.o" -type f -delete
	# Do the build, but with modified compiler, etc.:
	cd ${BUILD_WASM} && make CONFIGURE_LDFLAGS_NODIST="" LINKFORSHARED="-shared" \
							   CC="zig-fPIC cc" CXX="zig-fPIC c++" BLDSHARED="${BLDSHARED}"
	# Install as usual.
	cd ${BUILD_WASM} && make install
	# For some reason libmpdec.a isn't in libpython311.a, so we make it easy to link in later by copying
	# it over.  Similar for libexpat.a
	cp ${BUILD_WASM}/Modules/_decimal/libmpdec/libmpdec.a ${BUILD_WASM}/Modules/expat/libexpat.a ${DIST_WASM}/lib/
	touch ${DIST_WASM}/.built-cpython

wasm: ${DIST_WASM}/.built-cpython

${DIST_WASM}/.built: ${DIST_WASM}/.built-cpython
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD_WASM} && \
		mkdir -p usr/local/lib/python3.11/lib-dynload/  && \
	    LD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" DYLD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" \
			python3 ./Tools/wasm/wasm_assets.py && \
		rm -rf ${DIST_WASM}/lib/dist && \
		mv usr/local/lib ${DIST_WASM}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp src/termcap ${DIST_WASM}/lib/dist/termcap && cd ${DIST_WASM}/lib/dist/ && zip -u python311.zip termcap
	# **TODO:** It is very silly for these to be in the same zip file, obviously, because that means they have to be downloaded,
	# so we should just put them in the main binary.  We'll change that when things are working.
	mkdir ${DIST_WASM}/lib/dist/lib-dynload/
	cp -v ${DIST_WASM}/lib/python3.11/lib-dynload/*.so ${DIST_WASM}/lib/dist/lib-dynload/
	# Unfortunately, wasm-strip removes the critical custom section that makes the so file useful, since NotImplementedError
	#      https://reviews.llvm.org/D73820
	#find ${DIST_WASM}/lib/dist/lib-dynload -type f -name "*.so" | xargs -n1 ${CWD}/node_modules/.bin/wasm-strip
	# Instead, we use the -s option to wasm-ld above.
	cd ${DIST_WASM}/lib/dist/; zip -u python311.zip lib-dynload/*
	touch ${DIST_WASM}/.built

wasm-data: ${DIST_WASM}/.built

# Use "make run-wasm" to run our WASM python at the command line.
# You can also just run `python-wasm` in the top level bin/ directory.
.PHONY: run-wasm
run-wasm: ${DIST_WASM}/.built
	${PYTHON_WASM}

# Run the full official Python test suite on the wasm build.  We can't just do
# "make test" in build/wasm, since that only support wasmtime and emscripten.
RUN_TESTS =  _PYTHON_PROJECT_BASE=${BUILD_WASM} \
	_PYTHON_HOST_PLATFORM=wasi-wasm32 \
	PYTHONPATH=${BUILD_WASM}/build/lib.wasi-wasm32-3.11:./Lib \
	_PYTHON_SYSCONFIGDATA_NAME=_sysconfigdata__wasi_wasm32-wasi \
	${DIST_NATIVE}/bin/python3 \
	./Tools/scripts/run_tests.py

.PHONY: test
test:
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS}

test-using-worker:
	cd ${BUILD_WASM} && PYTHONHOME=${DIST_WASM} _PYTHON_HOSTRUNNER=${PYTHON_WASM} ${RUN_TESTS}


# Cleaning up

clean:
	rm -rf ${BUILD} ${DIST}
