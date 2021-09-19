# See https://www.python.org/downloads/
PYTHON_VERSION = 3.9.7

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
OPENSSL = ${CWD}/../openssl/dist
ZLIB = ${CWD}/../zlib/dist


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

${BUILD}/native: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf Python-${PYTHON_VERSION}.tar.xz -C native --strip-components=1

${BUILD}/native/.patched:
	# We only use the 0008-setup.patch patch, which is needed to get module building
	# to work when compiling with zig, I think due to having to explicitly build gnu libc 2.28,
	# which is to work around another issue with Zig...
	cd ${BUILD}/native && cat ${CWD}/src/build/python-patches/0008-setup.patch | patch -p1 && touch .patched

${DIST_NATIVE}/.built: ${BUILD}/native/.patched
	cd ${BUILD}/native && \
		LD_LIBRARY_PATH=${OPENSSL}/native/lib:${ZLIB}/native/lib \
		CFLAGS=-I${ZLIB}/native/include \
		LDFLAGS=-L${ZLIB}/native/lib \
		AR="zig ar" \
		CC="zig cc -target native-native-gnu.2.28" \
		./configure \
			--prefix=${DIST_NATIVE}   \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-shared \
			--with-openssl=${OPENSSL}/native
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


#############
# WASM
#############

# The posix library, which is needed to run Python standalone (via wasmer), rather
# than in node.js.  Also, the headers are needed in order to build at all.
${BUILD}/wasm-posix/libwasmposix.a: src/build/wasm-posix/wasm-posix.h src/build/wasm-posix/wasm-posix.c
	# Copy over and build our wasm posix library.
	mkdir -p ${BUILD}/wasm-posix/ && cp src/build/wasm-posix/wasm-posix.* ${BUILD}/wasm-posix/
	# -w (=no warnings) since this is almost all fake/stubbed function and would generate massive warning issues:
	cd ${BUILD}/wasm-posix/ \
		&& zig cc -w -target wasm32-wasi wasm-posix.c -c -o wasm-posix.o \
		&& zig ar -crs libwasmposix.a wasm-posix.o

${BUILD}/wasm: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf Python-${PYTHON_VERSION}.tar.xz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/Python-${PYTHON_VERSION}.wasm ${BUILD}/wasm-posix/libwasmposix.a
	cd ${BUILD}/Python-${PYTHON_VERSION}.wasm && INIT_CWD=${CWD} DIST=${CWD}/${DIST_WASM} ${CWD}/src/build/build-wasm.sh
	touch ${DIST_WASM}/.built

wasm: ${DIST_WASM}/.built



all: native wasm

clean:
	rm -rf ${BUILD}

clean-all: clean
	rm -rf ${DIST_NATIVE} ${DIST_WASM}
