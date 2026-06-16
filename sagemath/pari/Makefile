
include ../build/Makefile-vars

# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.17.3
URL = https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/pari-${VERSION}.tar.gz
TARBALL_SHA256 = 8d9c4fcd584c468d27e0f23c36836587284452094c4b1c404c20c4b810462dcb
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: deps wasm

include ../build/Makefile-rules

GMP_WASM = ${PACKAGES}/gmp/dist/wasm
GMP_CLANG = ${PACKAGES}/gmp/dist/clang
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
#POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

${GMP_WASM}/.built:
	make -C ${PACKAGES}/gmp

${GMP_CLANG}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-clang-standalone

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_CLANG}/.patched: ${BUILD_CLANG}/.build
	cd ${BUILD_CLANG} && \
		cat ${SRC}/patches/01-pipes.patch | patch -p1
	touch ${BUILD_CLANG}/.patched

.PHONY: test-clang-standalone
test-clang-standalone: ${GMP_CLANG}/lib/libgmp.a ${BUILD_CLANG}/.patched
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${GMP_CLANG} || status=$$?; \
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

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && \
		cat ${SRC}/patches/01-pipes.patch | patch -p1
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		cat ${SRC}/patches/01-pipes.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${GMP_WASM}/.built ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} && \
	CC="zcc" \
	AR="zig ar" \
	RANLIB="zig ranlib" \
		./Configure  \
			--static \
			--host=wasm-wasi \
			--prefix=${DIST_WASM} \
			--graphic=none \
			--with-gmp=${GMP_WASM}
	# Missing bits/ headers with zig:
	cd ${BUILD_WASM}/O* && \
		mkdir -p bits && cd bits && echo "#define __jmp_buf int"> setjmp.h && echo "" > wordsize.h
	cd ${BUILD_WASM}/O* && \
		make -j8 AR="zig ar" RANLIB="zig ranlib" gp
	cd ${BUILD_WASM}/O* && \
		make AR="zig ar" RANLIB="zig ranlib" install
	cp ${BUILD_WASM}/O*/gp-sta.wasm ${DIST_WASM}/bin
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	./dist/wasm/bin/gp </dev/null | grep "portable C/GMP"
	echo "7*17*17" | ./dist/wasm/bin/gp |grep 2023
