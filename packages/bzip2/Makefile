# We only make the wasm version, since we don't need native for our purposes.
all: wasm

include ../build/Makefile-vars

# See https://github.com/libarchive/bzip2/tags
VERSION=1.0.8
TARBALL = ${UPSTREAM}/bzip2-${VERSION}.tar.gz
URL = https://github.com/libarchive/bzip2/archive/refs/tags/bzip2-${VERSION}.tar.gz

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
	cp ${SRC}/extra_config.h ${BUILD_WASM}
	cd ${BUILD_WASM} \
		&&  echo '#include "extra_config.h"' >> bzlib.h \
		&&	make AR="zig ar" \
			CC="zig-fPIC cc" \
			RANLIB="zig ranlib" \
			PREFIX="${DIST_WASM}" \
			install -j8 \
		&&  cp extra_config.h ${DIST_WASM}/include/
	touch ${DIST_WASM}/.built
