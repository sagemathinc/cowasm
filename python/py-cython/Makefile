include ../build/Makefile-vars

all: wasm ${BIN}/cython

# See https://github.com/cython/cython/releases

VERSION = 0.29.32
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: node_modules ${BUILD_WASM}/.build
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.built
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	# NOTE: there's a lot of files in Cython that are NOT .so, not .pyc, but do
	# need to get included. They are also not in some special "data" location.
	cd ${BUILD_WASM}/build/lib* \
		&& npx @cowasm/cpython -m cowasm_bundler Cython cython.py Cython/Utility Cython/Includes \
		&& npx @cowasm/cpython -m cowasm_bundler pyximport
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp ${BUILD_WASM}/cython.py ${DIST_WASM}/
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/Cython.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/pyximport.tar.xz
	touch ${DIST_WASM}/.built

${BIN}/cython: bin/cython
	ln -sf ${CWD}/bin/cython ${BIN}/cython

# This is NOT the cython test suite, which is difficult to run due to using threads
# and probably doesn't work.  But we at least test something, which is building and
# running some of the demos.

# We touch numpy.py below is a little hack to disable the numpy test.
# That test fails since there's a bunch
# we need to do regarding disabling setjmp, etc., to get this stuff to build.

test: wasm
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} npx @cowasm/cpython -c 'import Cython'
	# Run an actual demo test suite
	cd ${BUILD_WASM}/Demos \
		&& rm -f *.so *.c \
		&& touch numpy.py \
		&& npx @cowasm/cpython setup.py build_ext --inplace \
		&& npx @cowasm/cpython run_primes.py 20 \
		&& npx @cowasm/cpython run_spam.py \
		&& npx @cowasm/cpython integrate_timing.py
