CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm

all: wasm

# Don't build native -- it's very likely available systemwide or we don't need it, and
# it breaks things.
# ## Native library
# ${BUILD}/native:
# 	rm -rf ${BUILD}/native
# 	mkdir -p ${BUILD}
# 	cd ${BUILD} && git clone https://github.com/kobolabs/liblzma.git native

# ${DIST_NATIVE}/.built: ${BUILD}/native
# 	cd ${BUILD}/native && CC="zig cc" CXX="zig c++" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
# 	cd ${BUILD}/native && make
# 	cd ${BUILD}/native && make install
# 	touch ${DIST_NATIVE}/.built

# .PHONY: native
# native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm:
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/kobolabs/liblzma.git wasm

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && RANLIB="zig ranlib" AR="zig ar" CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" ./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && echo '#include "../../../posix-wasm/dist/wasm/posix-wasm.h"' >> config.h
	# It fails to build some non-liblzma stuff (for xz) that we don't need, so we
	# ignore that and just install the library.
	cd ${BUILD}/wasm && make || true && cd src/liblzma && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
