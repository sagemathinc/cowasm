# See https://ftp.gnu.org/gnu/readline/

VERSION = 8.1

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
PACKAGES = ${CWD}/..

all: native wasm


${BUILD}/source.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/readline/readline-${VERSION}.tar.gz -o source.tar.gz

# NATIVE

${BUILD}/native: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf source.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && \
		CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm: ${BUILD}/source.tar.gz
	#rm -rf ${BUILD}/wasm
	#mkdir -p ${BUILD}/wasm
	#cd ${BUILD} && tar xf source.tar.gz -C wasm --strip-components=1

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/
${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		CONFIG_SITE=${SRC}/config.site \
		CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L"  \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc -O0" \
		CXX="zig-fPIC c++ -O0" \
		./configure \
			--host=none \
			--prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
