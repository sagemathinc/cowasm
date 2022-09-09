include ../build/Makefile-vars

# NOTE: original upstream is https://netlib.org/f2c/, and that does still get maintained.
# However, the maintenance is minimal, I don't trust the host, and MOST IMPORTANTLY, it is
# impossible to get a *specific known point in time version*.  A fundamental rule of
# downloading sources is that they have to be versioned and all versions stay available.

# See https://github.com/sagemathinc/f2c/releases
VERSION=2022-09-09

URL = https://github.com/sagemathinc/f2c/archive/refs/tags/${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/f2c-${VERSION}.tar.gz

all: native

include ../build/Makefile-rules

${DIST_NATIVE}/.built: ${DIST_NATIVE}/bin/f2c ${DIST_NATIVE}/lib/libf2c.a ${DIST_NATIVE}/include/f2c.h
	touch ${DIST_NATIVE}/.built

# NOTES:
#   - The zig built f2c crashes if you use -O0, but NOT with -O2!
${DIST_NATIVE}/bin/f2c: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE}/f2c \
		&& make CC="zig cc" CFLAGS="-O2" -j4 -f makefile.u \
		&& mkdir -p ${DIST_NATIVE}/bin \
		&& cp f2c ${DIST_NATIVE}/bin

${DIST_NATIVE}/lib/libf2c.a: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE}/libf2c \
		&& make CC="zig cc" CFLAGS="-O2" -j4 -f makefile.u \
		&& mkdir -p ${DIST_NATIVE}/lib \
		&& cp libf2c.a ${DIST_NATIVE}/lib

${DIST_NATIVE}/include/f2c.h: ${DIST_NATIVE}/bin/f2c
	mkdir -p ${DIST_NATIVE}/include/
	cp ${BUILD_NATIVE}/f2c/f2c.h ${DIST_NATIVE}/include/

# TODO/WARNING: The test actually fails with "zig cc" right now in numerous ways with
# malloc crashes and segfaults.
# These are clearly due to a bunch of bugs in zig cc that I haven't hit elsewhere.
# Hopefully these will go away someday when we update to a newer version of zig.
# We test with gcc below, which works.
test:
	rm -rf ${BUILD_NATIVE}/test
	mkdir -p ${BUILD_NATIVE}/test
	cp src/hello.f ${BUILD_NATIVE}/test
	cd ${BUILD_NATIVE}/test \
		&& ${DIST_NATIVE}/bin/f2c hello.f \
		&& gcc hello.c -w -o hello -I${DIST_NATIVE}/include -lf2c -L${DIST_NATIVE}/lib \
		&& ./hello | grep Hello   # would fail if "Hello" not in output.


# NOTES about wasm
#   - I tried targetting wasm with zcc and that just worked to build.
#   - But I need to make my wasm runtime env that zcc gives have full
#     posix, etc., since there's too many stubs for this to work, or
#     (perhaps better) patch f2c in a few place.  For now, I don't prioritize
#     using f2c in a browser...