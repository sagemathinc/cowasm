include ../build/Makefile-vars

# See https://gmplib.org for versions.
VERSION = 6.2.1
URL = https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/gmp-${VERSION}.tar.bz2

all: wasm

include ../build/Makefile-rules


${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		CC="cowasm-cc" \
		AR="zig ar" \
		RANLIB="zig ranlib" \
		ABI=standard \
		CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS}" \
		CFLAGS="-Oz" \
		./configure \
			--build i686-pc-linux-gnu \
			--host=none \
			--prefix=${DIST_WASM}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD_WASM} && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD_WASM} && make -j4 install
	touch ${DIST_WASM}/.built

test:
	echo "No GMP tests yet"