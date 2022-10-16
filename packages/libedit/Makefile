
include ../build/Makefile-vars

all: wasm native

VERSION = 20210910-3.1
TARBALL = ${UPSTREAM}/libedit-${VERSION}.tar.gz
URL = https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz

include ../build/Makefile-rules

# See https://www.thrysoee.dk/editline/

TERMCAP = ${PACKAGES}/termcap/dist

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} && \
		CFLAGS="-I${TERMCAP}/native/include -L${TERMCAP}/native/lib" \
		CC="zig cc -Oz  ${ZIG_NATIVE_CFLAGS_GNU} " \
		AR="zig ar" \
		./configure --prefix=${DIST_NATIVE}
	cd  ${BUILD_NATIVE} && make -j8
	cd  ${BUILD_NATIVE} && make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp -rv src/* ${BUILD_WASM}/src/
	cd ${BUILD_WASM}/src/ && patch -p0 < readline.patch
	touch ${BUILD_WASM}/.patched

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/

# We also modify examples/Makefile so we don't have to mess with getting them to build.

LDFLAGS = -L${TERMCAP}/wasm/lib -ltermcap

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${SRC}/config.site \
			CFLAGS="-Oz -I${TERMCAP}/wasm/include -D__STDC_ISO_10646__=201103L -D__wasilibc_unmodified_upstream_signal"  \
			LDFLAGS="${LDFLAGS}" \
			RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc -Oz" \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&&	echo '#include "extra_config.h"' >> config.h \
		&&	echo "all:" > examples/Makefile \
		&&	echo "install:" >> examples/Makefile \
		&&	make -j8 \
		&&	make install
	touch ${DIST_WASM}/.built

# Build test program
${BUILD_WASM}/examples/tc1:  ${DIST_WASM}/.built
	${BIN}/cowasm-cc -v -fvisibility-main -L${DIST_WASM}/lib -ledit ${LDFLAGS} \
		-I${BUILD_WASM}/ -I${BUILD_WASM}/src \
		${BUILD_WASM}/examples/tc1.c -o ${BUILD_WASM}/examples/tc1

run-tc1: ${BUILD_WASM}/examples/tc1
	${BIN}/cowasm ${BUILD_WASM}/examples/tc1

test: ${BUILD_WASM}/examples/tc1
	# This is a pretty dumb test, since not interactive, but at least it shows
	# that the program builds and runs at all...
	echo 'echo "hi"' | ${BIN}/cowasm ${BUILD_WASM}/examples/tc1 |grep "Edit"
