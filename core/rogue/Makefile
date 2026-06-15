include ../build/Makefile-vars

# See https://github.com/sagemathinc/rogue/releases
VERSION = v5.4.1
URL = https://github.com/sagemathinc/rogue/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/rogue-${VERSION}.tar.gz
TARBALL_SHA256 = c98e94b388b5976c5bf3e843621fde8a4156675e0ca7cb837e79094391b9ac59
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)
TERMCAP_WASI_SDK = ${CWD}/../termcap/dist/wasi-sdk
NCURSES_WASI_SDK = ${CWD}/../ncurses/dist/wasi-sdk

all:  wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

#DEBUG = -g
DEBUG =

# Below we use "--build=arm" since there are problems with ./config.guess
# and it doesn't matter anyways since no native code gets run as part of the
# build.  It's just an autconf shortcoming.  Without this, build fails on
# aarch64 linux.  With updated config.guess, build fails on aarch64-mac.
# So simple solution.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-Wall -fvisibility-main ${DEBUG} -Oz -Wno-deprecated-non-prototype -I${TERMCAP_WASM}/include -I${NCURSES_WASM}/include -I${NCURSES_WASM}/include/ncurses  -I${POSIX_WASM}" \
			LDFLAGS="${DEBUG} -L${NCURSES_WASM}/lib -lncurses " \
			./configure \
				--host=none \
				--build=arm \
				--prefix="${DIST_WASM}" \
		&& echo '#include "posix-wasm.h"' >> config.h \
		&& echo '#undef HAVE_WORKING_FORK' >> config.h \
		&& echo '#undef HAVE__SPAWNL' >> config.h \
		&& echo '#undef HAVE_SPAWNL' >> config.h \
		&& echo '#undef HAVE_GETPASS' >> config.h \
		&& make -j8 \
		&& make -j8 install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	echo "no test of rogue yet"

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${NCURSES_WASI_SDK}/lib/libncurses.a:
	$(MAKE) -C ../ncurses test-wasi-sdk-standalone

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build ${NCURSES_WASI_SDK}/lib/libncurses.a
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${TERMCAP_WASI_SDK} ${NCURSES_WASI_SDK} ${POSIX_WASM}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
