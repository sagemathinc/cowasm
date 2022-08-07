CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
export PATH := ${CWD}/../../bin:$(PATH)
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm

all: wasm-shared

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
	zig ranlib ${DIST_WASM}/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built



${BUILD}/wasm-shared:
	rm -rf ${BUILD}/wasm-shared
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/kobolabs/liblzma.git wasm-shared


${DIST_WASM}-shared/.built: ${BUILD}/wasm-shared
	cd ${BUILD}/wasm-shared && RANLIB="zig ranlib" AR="zig ar" CC="zig-fPIC cc" CXX="zig-fPIC c++" ./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM}-shared"
	cd ${BUILD}/wasm-shared && echo '#include "../../../posix-wasm/dist/wasm-shared/posix-wasm.h"' >> config.h
	# It fails to build some non-liblzma stuff (for xz) that we don't need, so we
	# ignore that and just install the library.
	cd ${BUILD}/wasm-shared && make || true && cd src/liblzma && make install
	zig ranlib ${DIST_WASM}-shared/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}-shared/.built

.PHONY: wasm-shared
wasm-shared: ${DIST_WASM}-shared/.built


clean:
	rm -rf build dist
