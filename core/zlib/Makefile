include ../build/Makefile-vars

# See https://github.com/sagemathinc/zlib/releases
ZLIB_VERSION = 1.2.13
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile

all: deps wasm

URL = https://github.com/sagemathinc/zlib/archive/refs/tags/${ZLIB_VERSION}.tar.gz
TARBALL = ${UPSTREAM}/zlib-${ZLIB_VERSION}.tar.xz
TARBALL_SHA256 = db0ff0d477b336bfce16483238c91242519ecea456ecb299a94851613598f9d5

include ../build/Makefile-rules

# NATIVE

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ${BUILD_NATIVE} \
		&&	AR="zig ar" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} " \
			./configure --static --prefix=${DIST_NATIVE} \
		&&	make install -j8
	touch ${DIST_NATIVE}/.built

# WASM

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	CHOST=none \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main" \
			./configure --static --prefix=${DIST_WASM} \
		&&	make -j8 install
	# Strangely the libz.a that gets built is mangled, e.g., "nm -a libz.a"
	# says "LLVM ERROR: malformed uleb128, extends past end"
	# so we just rebuild the archive from scratch from all of the .o files.
	# This happens both with and without -fPIC.
	cd ${BUILD_WASM} && \
		rm libz.a && \
		zig ar rc libz.a *.o && \
		cp libz.a ${DIST_WASM}/lib
	touch ${DIST_WASM}/.built


test: ${DIST_WASM}/.built
	cd ${BUILD_WASM} \
		&& make example \
		&& ${BIN}/cowasm ./example

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} || status=$$?; \
		if [ "$${status}" = 77 ]; then \
			exit 0; \
		fi; \
		exit $${status}

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
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN}

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
