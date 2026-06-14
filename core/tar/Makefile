# This builds libarchive -- i.e., the tar command.

include ../build/Makefile-vars

# See https://github.com/libarchive/libarchive/releases
VERSION = 3.6.1
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

URL = https://github.com/libarchive/libarchive/releases/download/v${VERSION}/libarchive-${VERSION}.tar.xz
TARBALL = ${UPSTREAM}/libarchive-${VERSION}.tar.gz
TARBALL_SHA256 = 5a411aceb978f43e626f0c2d1812ddd8807b645ed892453acabd532376c148e6

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
LZMA_WASM = $(shell cowasm-package-path @cowasm/lzma)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)
BZIP2_WASM = $(shell cowasm-package-path @cowasm/bzip2)

all: deps wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-main-visibility.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_CLANG}/.patched: ${BUILD_CLANG}/.build
	cd ${BUILD_CLANG} && cat ${SRC}/patches/01-main-visibility.patch | patch -p1
	touch ${BUILD_CLANG}/.patched

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.patched
	$(MAKE) -C ../zlib test-clang-standalone
	$(MAKE) -C ../bzip2 test-clang-standalone
	$(MAKE) -C ../lzma test-clang-standalone
	@status=0; \
	${SRC}/test-clang-standalone.sh \
		${BUILD_CLANG} \
		${DIST_CLANG} \
		${BIN} \
		${POSIX_WASM} \
		${CWD}/../zlib/dist/clang \
		${CWD}/../bzip2/dist/clang \
		${CWD}/../lzma/dist/clang \
		${SRC} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc" \
			CFLAGS="-Oz -I${POSIX_WASM} -I${LZMA_WASM}/include -I${ZLIB_WASM}/include -I${BZIP2_WASM}/include" \
			LDFLAGS="-L${LZMA_WASM}/lib -llzma -L${ZLIB_WASM}/lib -lz -L${BZIP2_WASM}/lib -lbz2" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./configure \
				--host=none \
				--program-transform-name='s/bsd//' \
				--prefix=${DIST_WASM} \
				--without-openssl \
				--without-xml2 \
				--without-expat \
				--without-libb2 \
				--without-iconv \
				--without-libiconv-prefix \
				--without-zstd \
				--without-cng \
				--without-lz4 \
		&&	cat ${SRC}/config.h >> config.h \
		&&	make -j12 \
		&&	make install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	# Check that each binary runs
	${BIN}/cowasm ${DIST_WASM}/bin/tar -h |grep "bsdtar ${VERSION}"
	${BIN}/cowasm ${DIST_WASM}/bin/cat --version |grep "bsdcat ${VERSION}"
	${BIN}/cowasm ${DIST_WASM}/bin/cpio --version |grep "bsdcpio ${VERSION}"
	# Consistency check -- do a compressed archive of dist, then extract,
	# then run tar at of that.  NOTE: this also illustrates the issue with
	# file permissions that is caused by WASI.
	rm -rf ${BUILD_WASM}/test
	mkdir -p ${BUILD_WASM}/test
	# This takes about 2 seconds, but is surprisingly competitive with native for speed.
	${BIN}/cowasm ${DIST_WASM}/bin/tar -Jcf ${BUILD_WASM}/test/dist.tar.xz dist
	cd ${BUILD_WASM}/test \
		&& ${BIN}/cowasm ${DIST_WASM}/bin/tar -xf dist.tar.xz \
		&& chmod +x dist/wasm/bin/tar \
		&& ${BIN}/cowasm dist/wasm/bin/tar -h |grep "bsdtar ${VERSION}"
