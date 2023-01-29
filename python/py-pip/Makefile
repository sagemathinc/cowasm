include ../build/Makefile-vars

all: wasm

# See https://github.com/pypa/pip/tags
#
VERSION = 22.3.1

URL = https://github.com/pypa/pip/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/pip-${VERSION}.tar.gz

include ../build/Makefile-rules

SETUPTOOLS = $(shell cowasm-package-path @cowasm/py-setuptools)

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# It would be much nicer to implement a better mmap.  But for now, let's just patch it out:
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-pip-no-mmap.patch | patch -p1
	# It would be better to have a better fallback for threads that works in some cases so we
	# don't need this. But for now, just remove it:
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-pip-no-auto-refresh-progress.patch  | patch -p1
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${SETUPTOOLS} npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.built

# Trying to use a bundle (e.g., only pyc, etc.,) leads to endless problems, since
# many scripts and components that use pip assume the .py files are there.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.built
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/build/lib/pip ${DIST_WASM}/
	# Build tools (e.g., for pandas, etc.) absolute require that setuptools actually be pip installed.
	# So we pip install it into site-packages, then copy everything over dist_wasm, so that
	# the directory setuptools-65.6.3.dist-info exists.  Basically, we used our own setuptools package
	# just for bootstrapping.  Probably this is very similar to what ensurepip does?
	# We do NOT just pip install pip because of the patches above...
	PYTHONPATH=${SETUPTOOLS}:${DIST_WASM} npx @cowasm/cpython -m pip install setuptools --target=${BUILD_WASM}/site-packages
	cp -r ${BUILD_WASM}/site-packages/* ${DIST_WASM}

test: ${DIST_WASM}/.built
	# Importing from the bundle works:
	PYTHONPATH=${DIST_WASM} npx @cowasm/cpython -c 'import pip'
	# The command line script works.
	PYTHONPATH=${DIST_WASM} npx @cowasm/cpython -m pip > /dev/null
