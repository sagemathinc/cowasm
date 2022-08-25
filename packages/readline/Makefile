include ../build/Makefile-vars

# See https://ftp.gnu.org/gnu/readline/

VERSION = 8.1
URL = https://ftp.gnu.org/gnu/readline/readline-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/readline-${VERSION}.tar.gz

all: wasm

include ../build/Makefile-rules

# NATIVE

${DIST_NATIVE}/.built: ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} \
		&& 	CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE} \
		&& 	make -j8 \
		&& 	make install
	touch ${DIST_NATIVE}/.built


# WASM

# For use of -D__STDC_ISO_10646__=201103L, see
#   https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/
#
${DIST_WASM}/.built: ${BUILD_WASM}
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${SRC}/config.site \
			CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L"  \
			RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="zig-fPIC cc -O0" \
			CXX="zig-fPIC c++ -O0" \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&&	make -j8 \
		&&	make install
	touch ${DIST_WASM}/.built
