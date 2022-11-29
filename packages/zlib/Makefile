include ../build/Makefile-vars

# See https://github.com/sagemathinc/zlib/releases
ZLIB_VERSION = 1.2.13

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile

all: wasm

URL = https://github.com/sagemathinc/zlib/archive/refs/tags/${ZLIB_VERSION}.tar.gz
TARBALL = ${UPSTREAM}/zlib-${ZLIB_VERSION}.tar.xz

include ../build/Makefile-rules

# NATIVE

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&&	AR="zig ar" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} " \
			./configure --static --prefix=${DIST_NATIVE} \
		&&	make install -j8
	touch ${DIST_NATIVE}/.built

# WASM

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&	CHOST=none \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main" \
			./configure --static --prefix=${DIST_WASM} \
		&&	make -j8 install
	# Strangely the libz.a that gets built is mangled, e.g., "nm -a libz.a"
	# says "LLVM ERROR: malformed uleb128, extends past end"
	# so we just rebuild the archive from scratch from all of the .o files.
	# This happens both with and without -fPIC.
	cd ${BUILD_WASM} && \
		rm libz.a && \
		zig ar rc libz.a *.o && \
		cp libz.a ${DIST_WASM}/lib
	touch ${DIST_WASM}/.built


test: ${DIST_WASM}/.built
	cd ${BUILD_WASM} \
		&& make example \
		&& ${BIN}/cowasm ./example