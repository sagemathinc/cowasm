include ../build/Makefile-vars

all: deps wasm

# See https://github.com/pypa/pip/tags
#
VERSION = 26.1.2

WHEEL = pip-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/p/pip/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 382ff9f685ee3bc25864f820aa50505825f10f5458ffff07e30a6d96e5715cab

include ../build/Makefile-vars-wheel

SETUPTOOLS = $(shell cowasm-package-path @cowasm/py-setuptools)

# Trying to use a bundle (e.g., only pyc, etc.,) leads to endless problems, since
# many scripts and components that use pip assume the .py files are there.
${DIST_WASM}/.built:  ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/pip ${DIST_WASM}/
	cp -r ${BUILD_WASM}/pip-${VERSION}.dist-info ${DIST_WASM}/
	# Build tools need setuptools metadata available alongside pip.
	cp -r ${SETUPTOOLS}/* ${DIST_WASM}/
	find ${DIST_WASM} -type d -name __pycache__ -prune -exec rm -rf {} +
	touch ${DIST_WASM}/.built

test: deps ${DIST_WASM}/.built
	# Importing from the bundle works:
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import pip'
	# The command line script works.
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} pnpm-exec cpython -m pip > /dev/null
