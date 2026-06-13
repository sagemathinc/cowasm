include ../build/Makefile-vars

all: deps wasm

# See https://github.com/pypa/setuptools/releases
VERSION = 82.0.1

WHEEL = setuptools-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/s/setuptools/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = a59e362652f08dcd477c78bb6e7bd9d80a7995bc73ce773050228a348ce2e5bb

include ../build/Makefile-vars-wheel

TOP_LEVEL = setuptools

define WHEEL_BUILD
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/setuptools ${DIST_WASM}/
	cp -r ${BUILD_WASM}/_distutils_hack ${DIST_WASM}/
	cp -r ${BUILD_WASM}/setuptools-${VERSION}.dist-info ${DIST_WASM}/
	cp ${BUILD_WASM}/distutils-precedence.pth ${DIST_WASM}/
endef

test: deps ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import setuptools; import setuptools.version'
