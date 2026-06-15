
all: deps wasm

include ../build/Makefile-vars

# See https://ftp.gnu.org/gnu/termcap/
# Not likely to change -- it hasn't in over 20 years!
VERSION = 1.3.1
TARBALL = ${UPSTREAM}/termcap-${VERSION}.tar.gz
URL = https://ftp.gnu.org/gnu/termcap/termcap-${VERSION}.tar.gz
TARBALL_SHA256 = 91a0e22e5387ca4467b5bcb18edf1c51b930262fd466d5fda396dd9d26719100
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
BUILD_TRIPLE = $(shell cc -dumpmachine 2>/dev/null || echo x86_64-pc-linux-gnu)

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${SRC} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${SRC}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

##################
# NATIVE
##################

# Having to do AR="zig ar" as argument to make is working around a bug in their use of autoconf.

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cp src/config.h ${BUILD_NATIVE}
	cd ${BUILD_NATIVE} && \
		CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} -DHAVE_CONFIG_H=1 " AR="zig ar" ./configure --prefix=${DIST_NATIVE} && \
		make AR="zig ar" -j8 && \
		make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ../build && make zig
	cp src/config.h ${BUILD_WASM}
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="cowasm-cc -Oz -DHAVE_CONFIG_H=1 " \
		./configure  --build=${BUILD_TRIPLE} --host=none --prefix="${DIST_WASM}" && \
		make AR="zig ar" -j8 && \
		make install
	touch ${DIST_WASM}/.built

test:
	echo "no tests yet"
