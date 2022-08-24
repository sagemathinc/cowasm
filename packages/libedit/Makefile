
include ../src/Makefile-vars

all:  wasm native


include ../src/Makefile-rules

# See https://www.thrysoee.dk/editline/

VERSION = 20210910-3.1

TARBALL = ${UPSTREAM}/libedit-${VERSION}.tar.gz

TERMCAP = ${PACKAGES}/termcap/dist


${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz -o ${TARBALL}

##################
# NATIVE
##################

${BUILD_NATIVE}: ${TARBALL}
	rm -rf ${BUILD_NATIVE}
	mkdir -p ${BUILD_NATIVE}
	tar xf ${TARBALL} -C ${BUILD_NATIVE} --strip-components=1

${DIST_NATIVE}/.built: ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} && \
		CFLAGS="-I${TERMCAP}/native/include -L${TERMCAP}/native/lib" \
		CC="zig cc -Oz" \
		AR="zig ar" \
		./configure --prefix=${DIST_NATIVE}
	cd  ${BUILD_NATIVE} && make -j8
	cd  ${BUILD_NATIVE} && make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${BUILD_WASM}: ${TARBALL}
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cd ${BUILD} && tar xf ${TARBALL} -C ${BUILD_WASM} --strip-components=1
	cp -rv src/* ${BUILD_WASM}/src/
	cd ${BUILD_WASM}/src/ && patch -p0 < readline.patch

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/

${DIST_WASM}/.built: ${BUILD_WASM}
	cd ${BUILD_WASM} && \
		CONFIG_SITE=${SRC}/config.site \
		CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L -D__wasilibc_unmodified_upstream_signal -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -Oz -target wasm32-wasi "  \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc -Oz" \
		CXX="zig-fPIC c++ -Oz" \
		./configure \
			--host=none \
			--prefix="${DIST_WASM}"
	cd ${BUILD_WASM} && make -j8
	cd ${BUILD_WASM} && make install
	touch ${DIST_WASM}/.built

