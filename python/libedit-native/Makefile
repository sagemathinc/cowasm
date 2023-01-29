
include ../build/Makefile-vars

all: native

VERSION = 20210910-3.1
TARBALL = ${UPSTREAM}/libedit-${VERSION}.tar.gz
URL = https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz

include ../build/Makefile-rules

# See https://www.thrysoee.dk/editline/

TERMCAP_NATIVE = ${PACKAGES}/termcap-native/dist/native

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ../termcap-native && make native
	cd ${BUILD_NATIVE} && \
		CFLAGS="-I${TERMCAP_NATIVE}/include -L${TERMCAP_NATIVE}/lib" \
		CC="zig cc -Oz  ${ZIG_NATIVE_CFLAGS_GNU} " \
		AR="zig ar" \
		./configure --prefix=${DIST_NATIVE}
	cd  ${BUILD_NATIVE} && make -j8
	cd  ${BUILD_NATIVE} && make install
	touch ${DIST_NATIVE}/.built

test: ${DIST_NATIVE}/.built
	echo "no test"