include ../build/Makefile-vars

all: wasm ${BIN}/cython

# See https://github.com/cython/cython/releases

VERSION = 0.29.32
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ../cpython && make pip  # TODO
	cd ${BUILD_WASM} \
		&& python-wasm setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ../cpython && make native  # TODO: python-wasm doesn't work with cowasm_bundler *yet*.
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	# NOTE: there's a lot of files in Cython that are NOT .so, not .pyc, but do
	# need to get included. They are also not in some special "data" location.
	cd ${BUILD_WASM}/build/lib* \
		&& python-native -m cowasm_bundler Cython cython.py Cython/Utility Cython/Includes \
		&& python-native -m cowasm_bundler pyximport \
		&& cp *.tar.xz ${DIST_WASM}
	cp ${BUILD_WASM}/cython.py ${DIST_WASM}/

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
	cd ../cpython && make pip  # TODO
	cd ${BUILD_WASM}/Demos \
		&& rm -f *.so *.c \
		&& touch numpy.py \
		&& python-wasm setup.py build_ext --inplace \
		&& python-wasm run_primes.py 20 \
		&& python-wasm run_spam.py \
		&& python-wasm integrate_timing.py
