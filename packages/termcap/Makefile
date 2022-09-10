
all: wasm native

include ../build/Makefile-vars

# See https://ftp.gnu.org/gnu/termcap/
# Not likely to change -- it hasn't in over 20 years!
VERSION = 1.3.1
TARBALL = ${UPSTREAM}/termcap-${VERSION}.tar.gz
URL = https://ftp.gnu.org/gnu/termcap/termcap-${VERSION}.tar.gz


include ../build/Makefile-rules

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} && \
		CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} " AR="zig ar" ./configure --prefix=${DIST_NATIVE} && \
		make -j8 && \
		make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc -Oz" \
		CXX="zig-fPIC c++" \
		./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM}" && \
		make -j8 && \
		make install
	touch ${DIST_WASM}/.built
