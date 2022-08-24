# We only make the wasm version, since we don't need native for our purposes.
all: wasm

include ../src/Makefile-vars

# See https://github.com/libarchive/bzip2/tags
VERSION=1.0.8
TARBALL = ${UPSTREAM}/bzip2-${VERSION}.tar.gz
URL = https://github.com/libarchive/bzip2/archive/refs/tags/bzip2-${VERSION}.tar.gz

include ../src/Makefile-rules

##################
# NATIVE
##################

${BUILD_NATIVE}: ${TARBALL}
	rm -rf ${DIST_NATIVE} ${BUILD_NATIVE}
	mkdir -p ${DIST_NATIVE} ${BUILD_NATIVE}
	tar xf ${UPSTREAM}/bzip2-${VERSION}.tar.gz -C ${BUILD_NATIVE} --strip-components=1

${DIST_NATIVE}/.built: ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} && \
		make AR="zig ar" \
		CC="zig cc" \
		RANLIB="zig ranlib" \
		PREFIX=${DIST_NATIVE} \
		install -j8
	touch ${DIST_NATIVE}/.built

##################
# WASM - STATIC
##################

${BUILD_WASM}: ${TARBALL}
	rm -rf ${DIST_WASM} ${BUILD_WASM}
	mkdir -p ${DIST_WASM} ${BUILD_WASM}
	tar xf ${TARBALL} -C ${BUILD_WASM} --strip-components=1

${DIST_WASM}/.built: ${BUILD_WASM}
	cd ${BUILD_WASM} && \
		make AR="zig ar" \
		CC="zig-fPIC cc" \
		RANLIB="zig ranlib" \
		PREFIX="${DIST_WASM}" \
		install -j8
	touch ${DIST_WASM}/.built
