include ../build/Makefile-vars

# This is the Qhull 2020.2 release used by matplotlib 3.6.2.
VERSION = 8.0.2
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

URL = https://github.com/qhull/qhull/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/qhull-${VERSION}.tar.gz
TARBALL_SHA256 = 8774e9a12c70b0180b95d6b0b563c5aa4bea8d5960c15e18ae3b6d2521d64f8b

all: deps wasm

include ../build/Makefile-rules

CMAKE_BUILD = ${BUILD_WASM}/cowasm-build

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.build
	cd ../build && make zig
	rm -rf ${DIST_WASM} ${CMAKE_BUILD}
	mkdir -p ${CMAKE_BUILD}
	mkdir -p ${BUILD_WASM}/bits
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	printf '%s\n' '#!/bin/sh' 'exec ${BIN}/zig ar "$$@"' > ${BUILD_WASM}/zig-ar
	printf '%s\n' '#!/bin/sh' 'exec ${BIN}/zig ranlib "$$@"' > ${BUILD_WASM}/zig-ranlib
	chmod +x ${BUILD_WASM}/zig-ar ${BUILD_WASM}/zig-ranlib
	cd ${CMAKE_BUILD} \
		&& cmake .. \
			-DCMAKE_BUILD_TYPE=Release \
			-DCMAKE_SYSTEM_NAME=Generic \
			-DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY \
			-DCMAKE_C_COMPILER=cowasm-cc \
			-DCMAKE_CXX_COMPILER=cowasm-c++ \
			-DCMAKE_C_FLAGS="-I${BUILD_WASM}" \
			-DCMAKE_CXX_FLAGS="-I${BUILD_WASM}" \
			-DCMAKE_AR=${BUILD_WASM}/zig-ar \
			-DCMAKE_RANLIB=${BUILD_WASM}/zig-ranlib \
			-DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
			-DBUILD_SHARED_LIBS=OFF \
			-DBUILD_STATIC_LIBS=ON \
			-DLINK_APPS_SHARED=OFF \
		&& cmake --build . --target qhullstatic_r --parallel 8
	mkdir -p ${DIST_WASM}/include ${DIST_WASM}/lib
	cp -R ${BUILD_WASM}/src/libqhull_r ${DIST_WASM}/include/
	mkdir -p ${DIST_WASM}/include/bits
	cp ${BUILD_WASM}/bits/setjmp.h ${DIST_WASM}/include/bits/setjmp.h
	cp ${CMAKE_BUILD}/libqhullstatic_r.a ${DIST_WASM}/lib/libqhull_r.a
	touch ${DIST_WASM}/.built

test: node_modules ${DIST_WASM}/.built
	printf '%s\n' \
		'#include <stdio.h>' \
		'#include <libqhull_r/libqhull_r.h>' \
		'int main(void) {' \
		'  qhT qh_qh;' \
		'  qhT *qh = &qh_qh;' \
		'  qh_zero(qh, stderr);' \
		'  qh_freeqhull(qh, !qh_ALL);' \
		'  return 0;' \
		'}' > ${BUILD_WASM}/cowasm-qhull-test.c
	cowasm-cc \
		-fvisibility-main \
		-I${DIST_WASM}/include \
		-L${DIST_WASM}/lib \
		${BUILD_WASM}/cowasm-qhull-test.c \
		-lqhull_r \
		-o ${BUILD_WASM}/cowasm-qhull-test
	cowasm ${BUILD_WASM}/cowasm-qhull-test
