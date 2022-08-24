
all: wasm native

include ../Makefile

# See https://ftp.gnu.org/gnu/termcap/
# Not likely to change -- it hasn't in over 20 years!
VERSION = 1.3.1

TARBALL = ${UPSTREAM}/termcap-${VERSION}.tar.gz

${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl https://ftp.gnu.org/gnu/termcap/termcap-${VERSION}.tar.gz -o ${TARBALL}

##################
# NATIVE
##################

${BUILD_NATIVE}: ${TARBALL}
	rm -rf ${BUILD_NATIVE}
	mkdir -p ${BUILD_NATIVE}
	cd ${BUILD} && tar xf ${TARBALL} -C ${BUILD_NATIVE} --strip-components=1

${DIST_NATIVE}/.built: ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} && \
		CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE} && \
		make -j8 && \
		make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${BUILD_WASM}: ${TARBALL}
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	tar xf ${TARBALL} -C ${BUILD_WASM} --strip-components=1

${DIST_WASM}/.built: ${BUILD_WASM}
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc -Oz" \
		CXX="zig-fPIC c++" \
		./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM}" && \
		make -j8 && \
		make install
	touch ${DIST_WASM}/.built
