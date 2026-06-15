# This builds mandoc, so we can make man pages available

include ../build/Makefile-vars

TARBALL = ${SRC}/mandoc-2022-10-14.tar.xz
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)
ZLIB_WASI_SDK = ${CWD}/../zlib/dist/wasi-sdk

all: deps wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/config.h ${SRC}/Makefile.local ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

# TODO: we could move fts out of coreutils and back into a separate library and
# then use it, instead of the compat here.  It should be moved to maybe posix-wasm.h
# actually, to save space in executables.

# Configure takes a long time and is always the same since it's always targetting
# webassembly, so we take the files it creates and just copy them in.  Here
# is how to regenerate the files from scratch:
#   make clean
#   make configure
configure: node_modules ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&	./configure \
				CC="cowasm-cc" \
				CFLAGS="-fvisibility-main -I${POSIX_WASM} -I${ZLIB_WASM}/include -Oz" \
				PREFIX=${DIST_WASM} \
		&&	echo '#include "posix-wasm.h"' >> config.h  \
		&&  echo '#define EFTYPE EINVAL' >> config.h  \
		&&  echo '#undef HAVE_FTS' >> config.h  \
		&&  echo '#undef HAVE_STRINGLIST' >> config.h


${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	make -j8  \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			CC="cowasm-cc" \
			CFLAGS="-fvisibility-main -I${POSIX_WASM} -I${ZLIB_WASM}/include -Oz" \
			LDFLAGS="-L ${ZLIB_WASM}/lib -lz" \
			PREFIX=${DIST_WASM} \
			man
	mkdir -p ${DIST_WASM}/bin
	cp -v ${BUILD_WASM}/mandoc ${DIST_WASM}/bin/man
	touch ${DIST_WASM}/.built

test: node_modules wasm
	echo "" | cowasm ${DIST_WASM}/bin/man build/wasm/man.1 | grep "display manual pages"

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	$(MAKE) -C ../zlib test-clang-standalone || status=$$?; \
		if [ "$${status}" = 77 ]; then \
			exit 0; \
		elif [ "$${status}" != 0 ]; then \
			exit $${status}; \
		fi; \
		if [ ! -d "${CWD}/../zlib/dist/clang" ]; then \
			echo "Skipping man clang standalone smoke: zlib clang standalone artifact is not available."; \
			exit 0; \
		fi; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${POSIX_WASM} ${CWD}/../zlib/dist/clang ${SRC} || status=$$?; \
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

${ZLIB_WASI_SDK}/lib/libz.a:
	$(MAKE) -C ../zlib test-wasi-sdk-standalone

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build ${ZLIB_WASI_SDK}/lib/libz.a
	cd ../build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${POSIX_WASM} ${ZLIB_WASI_SDK} ${SRC} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
