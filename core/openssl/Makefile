include ../build/Makefile-vars

# See https://github.com/openssl/openssl/tags
VERSION = 3.0.7
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
URL = https://github.com/openssl/openssl/archive/refs/tags/openssl-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/openssl-${VERSION}.tar.gz
TARBALL_SHA256 = e8f73590815846db286d215950fdef9b882bb6b886d50acb431c0285782fe35b


POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

all: deps wasm

include ../build/Makefile-rules

## Native

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ${BUILD_NATIVE} \
		&& 	CC="zig cc ${ZIG_NATIVE_CFLAGS} " \
			AR="zig ar" \
			LDFLAGS="-shared" \
			./Configure --prefix=${DIST_NATIVE} -no-tests  -no-asm -static -no-afalgeng \
		&&	make -j8 build_sw\
		&&	make -j8 install_sw
	touch ${DIST_NATIVE}/.built

## WASM

# Somebody else built openssl for webassembly once here
#   https://github.com/DigitalArsenal/openssl.js/tree/master/packages/openssl

${BUILD_WASM}/.patched:: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&  patch --strip 1 < ${SRC}/patches/00-af-unix.patch \
		&&  patch --strip 1 < ${SRC}/patches/01-cleanup-hack.patch \
		&&	echo '#include "posix-wasm.h"' >> e_os.h \
		&&	echo '#include "posix-wasm.h"' >> include/openssl/crypto.h \
		&&	echo "#undef AF_UNIX" >> e_os.h \
		&&	echo "#undef AF_UNIX" >> include/internal/thread_once.h
	touch ${BUILD_WASM}/.patched


DEBUG = ""
# Uncomment for debugging symbols:
# DEBUG="-g"


# make -j12, since openssl is structured as huge number of tiny files.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&& 	CC="cowasm-cc" \
			CFLAGS="-Oz ${DEBUG} -fvisibility-main -I${POSIX_WASM}" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./Configure --prefix=${DIST_WASM} gcc no-async no-threads no-shared no-tests no-asm no-afalgeng \
		&&	make -j12 build_sw \
		&&	make -j12 install_sw
	touch ${DIST_WASM}/.built

test: node_modules ${DIST_WASM}/.built
	test x"`echo "foo" | cowasm dist/wasm/bin/openssl md5`" = x"MD5(stdin)= d3b07384d113edec49eaa6238ad5ff00"

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_CLANG}/.patched: ${BUILD_CLANG}/.build
	cd ${BUILD_CLANG} \
		&&  patch --strip 1 < ${SRC}/patches/00-af-unix.patch \
		&&  patch --strip 1 < ${SRC}/patches/01-cleanup-hack.patch \
		&&	echo '#include "posix-wasm.h"' >> e_os.h \
		&&	echo '#include "posix-wasm.h"' >> include/openssl/crypto.h \
		&&	echo "#undef AF_UNIX" >> e_os.h \
		&&	echo "#undef AF_UNIX" >> include/internal/thread_once.h
	touch ${BUILD_CLANG}/.patched

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.patched
	$(MAKE) -C ../posix-wasm wasm
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../posix-wasm/dist/wasm ${SRC} || status=$$?; \
		if [ "$${status}" = 77 ]; then \
			exit 0; \
		fi; \
		exit $${status}

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} \
		&&  patch --strip 1 < ${SRC}/patches/00-af-unix.patch \
		&&  patch --strip 1 < ${SRC}/patches/01-cleanup-hack.patch \
		&&	echo '#include "posix-wasm.h"' >> e_os.h \
		&&	echo '#include "posix-wasm.h"' >> include/openssl/crypto.h \
		&&	echo "#undef AF_UNIX" >> e_os.h \
		&&	echo "#undef AF_UNIX" >> include/internal/thread_once.h
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.patched
	$(MAKE) -C ../posix-wasm wasm
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CWD}/../posix-wasm/dist/wasm ${SRC}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
