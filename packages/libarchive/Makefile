# This builds libarchive.

include ../build/Makefile-vars

# See https://github.com/libarchive/libarchive/releases
VERSION = 3.6.1

URL = https://github.com/libarchive/libarchive/releases/download/v${VERSION}/libarchive-${VERSION}.tar.xz
TARBALL = ${UPSTREAM}/libarchive-${VERSION}.tar.gz

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
ZLIB = ${PACKAGES}/zlib/dist/wasm
LZMA = ${PACKAGES}/lzma/dist/wasm
BZ2 = ${PACKAGES}/bzip2/dist/wasm

CFLAGS = -Oz -I${POSIX_WASM} -I${LZMA}/include -I${ZLIB}/include -I${BZ2}/include
LDFLAGS = -L${LZMA}/lib -llzma -L${ZLIB}/lib -lz -L${BZ2}/lib -lbz2

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-main-visibility.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc" \
			CFLAGS="${CFLAGS}" \
			LDFLAGS="${LDFLAGS}" \
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
