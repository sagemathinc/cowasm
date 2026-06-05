##
# This does not work at all yet.
##

include ../build/Makefile-vars

# https://github.com/matplotlib/matplotlib/releases
VERSION=3.6.2


URL = https://github.com/matplotlib/matplotlib/archive/refs/tags/v${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/matplotlib-${VERSION}.tar.gz
TARBALL_SHA256 = 5ac5ca25e6ecd1e7711e1f859b4b6f74f290ef517387d1502bf8012bf2b1647e

#all: deps wasm
all:

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.install:  ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.install

${DIST_WASM}/.built: ${BUILD_WASM}/.install
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	touch ${DIST_WASM}/.built

#test: ${DIST_WASM}/.built
#	echo "It built!"

test:
	echo "matplotlib not done at all"
	false
