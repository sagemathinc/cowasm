
all: native


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
	cd ../build && make zig
	cp src/config.h ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} && \
		CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} -DHAVE_CONFIG_H=1 " AR="zig ar" ./configure --prefix=${DIST_NATIVE} && \
		make -j8 && \
		make install
	touch ${DIST_NATIVE}/.built

test: ${DIST_NATIVE}/.built
	echo "no test"