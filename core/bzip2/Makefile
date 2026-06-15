# We only make the wasm version, since we don't need native for our purposes.
all:  wasm

include ../build/Makefile-vars

# See https://github.com/libarchive/bzip2/tags
VERSION=1.0.8
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
TARBALL = ${UPSTREAM}/bzip2-${VERSION}.tar.gz
URL = https://github.com/libarchive/bzip2/archive/refs/tags/bzip2-${VERSION}.tar.gz
TARBALL_SHA256 = db106b740252669664fd8f3a1c69fe7f689d5cd4b132f82ba82b9afba27627df

include ../build/Makefile-rules

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} && \
		make AR="zig ar" \
		CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
		RANLIB="zig ranlib" \
		PREFIX=${DIST_NATIVE} \
		install -j8
	touch ${DIST_NATIVE}/.built

##################
# WASM
##################

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ../build && make zig
	cp ${SRC}/extra_config.h ${BUILD_WASM}
	cd ${BUILD_WASM} \
		&&  echo '#include "extra_config.h"' >> bzlib.h \
		&&	make -j8 \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main" \
			RANLIB="zig ranlib" \
			PREFIX="${DIST_WASM}" \
			install \
		&&  cp extra_config.h ${DIST_WASM}/include/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	# compress and decompress a file using the bzip2 and bunzip2 WASM executables.
	echo "coWasm" > ${BUILD_WASM}/testfile.txt
	${BIN}/cowasm ${DIST_WASM}/bin/bzip2 ${BUILD_WASM}/testfile.txt
	${BIN}/cowasm ${DIST_WASM}/bin/bunzip2 ${BUILD_WASM}/testfile.txt.bz2
	cat  ${BUILD_WASM}/testfile.txt |grep coWasm
	rm ${BUILD_WASM}/testfile.txt

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${SRC} || status=$$?; \
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

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${SRC}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
