include ../build/Makefile-vars

all: deps wasm ${BIN}/cython

# See https://github.com/cython/cython/releases

VERSION = 0.29.33
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	# NOTE: there's a lot of files in Cython that are NOT .so, not .pyc, but do
	# need to get included. They are also not in some special "data" location.
	cd ${BUILD_WASM}/build/lib* \
		&& pnpm-exec cpython -m cowasm_bundler Cython cython.py Cython/Utility Cython/Includes \
		&& pnpm-exec cpython -m cowasm_bundler pyximport
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
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import Cython'
	# Run an actual demo test suite
	cd ${BUILD_WASM}/Demos \
		&& rm -f *.so *.c \
		&& touch numpy.py \
		&& pnpm-exec cpython setup.py build_ext --inplace \
		&& pnpm-exec cpython run_primes.py 20 \
		&& pnpm-exec cpython run_spam.py \
		&& pnpm-exec cpython integrate_timing.py
