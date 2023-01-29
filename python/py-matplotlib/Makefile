##
# This does not work at all yet.
##

include ../build/Makefile-vars

# https://github.com/matplotlib/matplotlib/releases
VERSION=3.6.2


URL = https://github.com/matplotlib/matplotlib/archive/refs/tags/v${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/matplotlib-${VERSION}.tar.gz

#all: wasm
all:

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.install: node_modules ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.install

${DIST_WASM}/.built: ${BUILD_WASM}/.install
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	touch ${DIST_WASM}/.built

#test: ${DIST_WASM}/.built
#	echo "It built!"

test:
	echo "matplotlib not done at all"