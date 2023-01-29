include ../build/Makefile-vars

all: wasm

# See https://github.com/pypa/setuptools/releases
VERSION = 65.6.3

URL = https://github.com/pypa/setuptools/archive/refs/tags/v65.6.3.tar.gz
TARBALL = ${UPSTREAM}/setuptools-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# We apply one patch to support building C++ extensions.  Without this, the numpy
	# build fails pretty quickly. This is needed due to our hacky approach to -fPIC.
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-c++.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.built
	# Hack: since we are not "properly" installing using "ensurepip", we replace
	# the code in version.py that calls pkg_resources (and looks at data in site-packages),
	# and instead just hardcode the version, which we know of course.
	# Note that we only use setuptools to bootstrap installing pip, then replace
	# setuptools with the one from pip.
	echo '__version__="${VERSION}"' > ${BUILD_WASM}/build/lib/setuptools/version.py
	# create bundles
	cd ${BUILD_WASM}/build/lib \
		&& npx @cowasm/cpython -m cowasm_bundler setuptools \
		&& npx @cowasm/cpython -m cowasm_bundler _distutils_hack \
		&& npx @cowasm/cpython -m cowasm_bundler pkg_resources
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/setuptools.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/_distutils_hack.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/pkg_resources.tar.xz
	touch ${DIST_WASM}/.built

test: node_modules ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} npx @cowasm/cpython  -c 'import setuptools'
