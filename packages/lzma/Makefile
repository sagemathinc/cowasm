CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
export PATH := ${CWD}/../../bin:$(PATH)
BUILD = ${CWD}/build
DIST_WASM = ${CWD}/dist/wasm

all: wasm

##################
# WASM - STATIC
##################

${BUILD}/wasm:
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/kobolabs/liblzma.git wasm

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc" \
		CXX="zig-fPIC c++" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none --prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && echo '#include "../../../posix-wasm/dist/wasm/posix-wasm.h"' >> config.h
	# It fails to build some non-liblzma stuff (for xz) that we don't need, so we
	# ignore that and just install the library.
	cd ${BUILD}/wasm && make || true && cd src/liblzma && make install
	zig ranlib ${DIST_WASM}/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf build dist
