include ../build/Makefile-vars

all: wasm

# See https://pypi.org/project/ipython/#files
# Note that with PYPI (unlike github) you have to copy the entire URL to the source
# every single time.  Updating the version is not sufficient.
VERSION = 8.6.0
URL = https://files.pythonhosted.org/packages/7f/59/05e94e067afb61460f0d5229a1edb800e2f65b8436085fad9cd262d80d45/ipython-8.6.0.tar.gz
TARBALL = ${UPSTREAM}/ipython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.built

test: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=`pwd` python-wasm mpmath/tests/runtests.py

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM} \
		&& ${BIN}/python-wasm setup.py build
	touch ${DIST_WASM}/.built

