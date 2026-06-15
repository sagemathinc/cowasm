include ../build/Makefile-vars

# See https://gmplib.org for versions.
VERSION = 6.2.1
URL = https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/gmp-${VERSION}.tar.bz2
TARBALL_SHA256 = eae9326beb4158c386e39a356818031bd28f3124cf915f8c5b1dc4c7a36b4d7c
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: wasm

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	ZIG_NATIVE_CFLAGS=${ZIG_NATIVE_CFLAGS} \
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
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${SRC} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk


${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		CC="cowasm-cc" \
		AR="zig ar" \
		RANLIB="zig ranlib" \
		ABI=standard \
		CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS}" \
		CFLAGS="-Oz" \
		./configure \
			--build i686-pc-linux-gnu \
			--host=none \
			--prefix=${DIST_WASM}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD_WASM} && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD_WASM} && make -j4 install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	${BIN}/cowasm-cc \
		-fvisibility-main \
		-Oz \
		-I${DIST_WASM}/include \
		-L${DIST_WASM}/lib \
		${SRC}/test-gmp.c \
		-lgmp \
		-o ${BUILD_WASM}/test-gmp
	${BIN}/cowasm ${BUILD_WASM}/test-gmp | grep 1606938044258990275541962092341162602522202993782792835301376
