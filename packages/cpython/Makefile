#
# We build a native version of CPython and a WASM version.
# The native version is ONLY used as part of the cross compilation build process
# and not used for anything else.  TODO: Currently, we can't build native Python using
# only zig on our supported architectures, so we use the native toolchain, which is
# really annoying and makes bootstraping a build a little harder.
#
# We only build a *shared* -fPIC version of the WASM version by using our zig-fPIC
# wrapper script, which is in the dylink package.  Note that the dylink package
# actually creates libpython.so right now.
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
DIST_WASM_STATIC = ${DIST}/wasm
BUILD_WASM_STATIC = ${BUILD}/wasm-static
DIST_WASM_SHARED = ${DIST}/wasm-shared
BUILD_WASM_SHARED = ${BUILD}/wasm-shared
ZLIB = ${CWD}/../zlib/dist
LZMA = ${CWD}/../lzma/dist
LIBEDIT = ${CWD}/../libedit/dist
SQLITE = ${CWD}/../sqlite/dist
POSIX_WASM = ${CWD}/../posix-wasm/dist

NCURSES = ${CWD}/../ncurses/dist
NCURSES_INCLUDE = -I${NCURSES}/wasm/include/ncurses -I${NCURSES}/wasm/include
NCURSES_LIB = -L${NCURSES}/wasm/lib

PYTHON_WASM_BINARY = ${CWD}/../../bin/python-wasm

# We only use zlib (not lzma) for native build, since liblzma widely available natively.
export DYLD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export LD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export PATH := ${CWD}/../../bin:${DIST_NATIVE}/bin:${PATH}

# Default target
.PHONY: all
all: ${CWD}/dist/.built

${CWD}/dist/.built: native wasm-static wasm-shared  wasm-data
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
# WASM  STATIC
# We build this for the core CPython interpreter and runtime.
#############

${BUILD_WASM_STATIC}/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD_WASM_STATIC} && mkdir -p ${BUILD_WASM_STATIC}
	tar xf ${BUILD}/Python-${PYTHON_VERSION}.tar.xz -C ${BUILD_WASM_STATIC} --strip-components=1
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	ln -s ${CWD}/src/rebuild ${BUILD_WASM_STATIC}/rebuild
	cp src/config.site ${BUILD_WASM_STATIC}
	cp src/Setup.local-static ${BUILD_WASM_STATIC}/Modules/Setup.local
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to posix-wasm.h
	mkdir ${BUILD_WASM_STATIC}/sys && echo '#include "posix-wasm.h"' >  ${BUILD_WASM_STATIC}/sys/wait.h
	cd ${BUILD_WASM_STATIC}/Lib && cat ${CWD}/src/python-patches/02-pydoc.patch | patch -p0
	touch ${BUILD_WASM_STATIC}/.patched

${DIST_WASM_STATIC}/.built-cpython: ${BUILD_WASM_STATIC}/.patched ${DIST_NATIVE}/.built
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - without-pymalloc below because pymalloc uses mmap and munmap, and WASI/our libc doesn't provide them.
	#   We could try to write them ourselves (?)...
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	# - We use -I (path to source) in the CC/CXX line in addition to CFLAGS so that we can override some
	#   bad global libraries, e.g., systemwide (zig musl) sys/wait.h with a local version.
	cd ${BUILD_WASM_STATIC} && \
		CC="zig cc -Oz -target wasm32-wasi  " \
		CXX="zig c++ -Oz -target wasm32-wasi " \
		AR="zig ar" \
		CFLAGS="-D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -I${BUILD_WASM_STATIC} -I${ZLIB}/wasm/include  -I${LZMA}/wasm/include -I${LIBEDIT}/wasm/include ${NCURSES_INCLUDE} -I${POSIX_WASM}/wasm" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--config-cache \
			--prefix=${DIST_WASM_STATIC}  \
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
	cat src/pyconfig.h >> ${BUILD_WASM_STATIC}/pyconfig.h
	cd ${BUILD_WASM_STATIC} && make
	# These are missing, breaking the "make install".  Why? TODO!
	cd ${BUILD_WASM_STATIC} && touch Modules/_testimportmultiple.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/_testmultiphase.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so Modules/xxlimited_35.cpython-${PYTHON_MAJOR}${PYTHON_MINOR}-wasm32-wasi.so
	cd ${BUILD_WASM_STATIC} && make install
	# For some reason libmpdec.a isn't in libpython, so we make it easy by copying it over:
	cp ${BUILD_WASM_STATIC}/Modules/_decimal/libmpdec/libmpdec.a ${DIST_WASM_STATIC}/lib/
	touch ${DIST_WASM_STATIC}/.built-cpython

.PHONY: wasm-static
wasm-static: ${DIST_WASM_STATIC}/.built-cpython


#############
# WASM SHARED
# We build this entirely for the shared modules:
#   - sqlite3
# TODO: In theory it should be possible to build the so using the right fPIC stuff in some way
# as part of the build above, rather than having to do two separate builds.    This might take
# slightly patching the Python build system, or running make twice with different arguments.
#############


${BUILD_WASM_SHARED}/.patched: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD_WASM_SHARED}
	mkdir -p ${BUILD}
	cd ${BUILD} && mkdir wasm-shared && tar xf Python-${PYTHON_VERSION}.tar.xz -C wasm-shared --strip-components=1 \
	# Also copy the config.site, which answers some questions needed for
	# cross compiling, without which ./configure won't work.
	ln -s ${CWD}/src/rebuild-shared ${BUILD_WASM_SHARED}/rebuild
	cp src/config.site ${BUILD_WASM_SHARED}
	cp src/Setup.local ${BUILD_WASM_SHARED}/Modules
	cp ${POSIX_WASM}/wasm/*.h ${BUILD_WASM_SHARED}
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to posix-wasm.h
	mkdir ${BUILD_WASM_SHARED}/sys && echo '#include "posix-wasm.h"' >  ${BUILD_WASM_SHARED}/sys/wait.h
	cd ${BUILD_WASM_SHARED}/Lib && cat ${CWD}/src/python-patches/02-pydoc.patch | patch -p0
	cd ${BUILD_WASM_SHARED}/Tools/wasm/ && cat ${CWD}/src/python-patches/03-wasm-assets.patch | patch -p0
	# Make it so just the trampoline functions are available to us using sed instead of a patch to 5
	# files, which is a lot to deal with.  On the other hand, this could silently fail if the sources
	# change too much, whereas patches are loud.
	touch ${BUILD_WASM_SHARED}/.patched


# The -s option to BLDSHARED below strips debug symbols from the shared object libraries for extension modules,
# as explained here:
#     https://stackoverflow.com/questions/6085491/gcc-vs-clang-symbol-stripping
# It would be nicer to build them with the symbols in (the default), then use wasm-strip
# later when packaging things up.  Unfortunately, wasm-strip only implements "strip everything",
# not just debug symbols.  There's code here  https://reviews.llvm.org/D73820 for the general
# case, but I guess it isn't merged.
# NOTE: BLDSHARED_DEBUG = build a huge libpython.so with debugging symbols
#       BLDSHARED_PROD = remove debugging symbols.
# The choice must be made at compile time since wasm-strip is very limited as mentioned above.
# This doesn't impact libpython.so, which is assembled by the dylink package.

BLDSHARED_DEBUG = zig wasm-ld --experimental-pic -shared
BLDSHARED_PROD = ${BLDSHARED_DEBUG}  -s

${DIST_WASM_SHARED}/.built-cpython-shared: ${BUILD_WASM_SHARED}/.patched
	cd ${BUILD_WASM_SHARED} && \
		CC="zig-fPIC cc" \
		CXX="zig-fPIC c++" \
		BLDSHARED="${BLDSHARED_PROD}" \
		AR="zig ar" \
		CFLAGS=" -Oz  -I${BUILD_WASM_SHARED}/ -I${ZLIB}/wasm/include  -I${LZMA}/wasm/include -I${LIBEDIT}/wasm/include  -I${SQLITE}/wasm/include  ${NCURSES_INCLUDE}" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--config-cache \
			--prefix=${DIST_WASM_SHARED}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-shared \
			--disable-ipv6 \
			--with-readline=editline \
			--with-build-python=${DIST_NATIVE}/bin/python3 \
			--without-pymalloc \
			--without-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	cat src/pyconfig.h >> ${BUILD_WASM_SHARED}/pyconfig.h
	# The CONFIGURE_LDFLAGS_NODIST="" is because CONFIGURE_LDFLAGS_NODIST has a bunch of warning options that don't work with wasm-ld.
	# The LINKFORSHARED=-shared is needed, or we hit https://github.com/ziglang/zig/issues/11045
	cd ${BUILD_WASM_SHARED} && \
		make CONFIGURE_LDFLAGS_NODIST="" LINKFORSHARED="-shared" && \
		make CONFIGURE_LDFLAGS_NODIST="" LINKFORSHARED="-shared" install
	# TODO: much more to do than just this, longterm...
	cp ${BUILD_WASM_SHARED}/build/lib.wasi-wasm32-3.11/_sqlite3.cpython-311-wasm32-emscripten.so ${DIST_WASM_SHARED}/lib/python3.11/lib-dynload/_sqlite3.cpython-311-wasm32-wasi.so
	touch ${DIST_WASM_SHARED}/.built-cpython-shared

.PHONY: wasm-shared
wasm-shared: ${DIST_WASM_SHARED}/.built-cpython-shared


# node_modules would currently only be needed to use wasm-strip.
# node_modules:
# 	npm ci

touch ${DIST_WASM_SHARED}/.built: ${DIST_WASM_SHARED}/.built-cpython-shared
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD_WASM_SHARED} && \
		mkdir -p usr/local/lib/python3.11/lib-dynload/  && \
	    LD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" DYLD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" \
			python3 ./Tools/wasm/wasm_assets.py && \
		rm -rf ${DIST_WASM_SHARED}/lib/dist && \
		mv usr/local/lib ${DIST_WASM_SHARED}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp src/termcap ${DIST_WASM_SHARED}/lib/dist/termcap && cd ${DIST_WASM_SHARED}/lib/dist/ && zip -u python311.zip termcap
	mkdir ${DIST_WASM_SHARED}/lib/dist/lib-dynload/
	cp ${DIST_WASM_SHARED}/lib/python3.11/lib-dynload/_sqlite3.cpython-311-wasm32-wasi.so ${DIST_WASM_SHARED}/lib/dist/lib-dynload/
	# Unfortunately, wasm-strip removes the critical custom section tht makes the so file useful, since NotImplementedError
	#      https://reviews.llvm.org/D73820
	#find ${DIST_WASM_SHARED}/lib/dist/lib-dynload -type f -name "*.so" | xargs -n1 ${CWD}/node_modules/.bin/wasm-strip
	cd ${DIST_WASM_SHARED}/lib/dist/; zip -u python311.zip lib-dynload/*
	touch ${DIST_WASM_SHARED}/.built

.PHONY: wasm-data
wasm-data: ${DIST_WASM_SHARED}/.built

# Use "make run-wasm" to run our WASM python at the command line.
# You can also just run `python-wasm` in the top level bin/ directory.
.PHONY: run-wasm
run-wasm: ${DIST_WASM_SHARED}/.built
	${PYTHON_WASM_BINARY}

# TODO: this test below is NOT useful yet.
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
	cd ${BUILD_WASM_SHARED}/Lib/test && ls -d `pwd`/test_*.py | grep -v test_lzma.py | grep -v  test_queue.py | xargs -t -n 1 ${PYTHON_WASM_BINARY} 2>&1 | tee ${BUILD_WASM_SHARED}/test.out && \
	grep FAIL ${BUILD_WASM_SHARED}/test.out
	echo "See ${BUILD_WASM_SHARED}/test.out"


# Cleaning up

clean:
	rm -rf ${BUILD} ${DIST}
