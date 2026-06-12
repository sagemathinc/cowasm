include ../build/Makefile-vars

all: deps wasm

VERSION = 1.3.1
WHEEL = cppy-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/c/cppy/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 7ca132b6ef6187384738804bd3a453d4eab7e3274df6dcd35e5d92aae3404717

include ../build/Makefile-vars-wheel

TOP_LEVEL = cppy
SETUPTOOLS = $(shell cowasm-package-path @cowasm/py-setuptools)

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${BUILD_WASM} && PYTHONPATH=${PYTHONPATH} pnpm-exec cpython -m cowasm_bundler ${TOP_LEVEL}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/${TOP_LEVEL}.tar.xz
	cp -r ${BUILD_WASM}/cppy/include ${DIST_WASM}/cppy/
	touch ${DIST_WASM}/.built

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM}:${SETUPTOOLS} pnpm-exec cpython -c 'import cppy; assert cppy.__version__ == "1.3.1"'
