include ../build/Makefile-vars

all: wasm ${BIN}/cython

# See https://github.com/cython/cython/releases

VERSION = 0.29.32
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& zython-debug setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${BUILD_WASM}/build/lib* \
		&& python-native -m zython_bundler Cython \
		&& python-native -m zython_bundler pyximport \
		&& cp *.tar.xz ${DIST_WASM}
	cp ${BUILD_WASM}/cython.py ${DIST_WASM}/

	# Copy over the cython package we just built.
	# (TODO: this is just a bootstraping problem.)
	cd ${PACKAGES}/python-wasm && make packages

	touch ${DIST_WASM}/.built

${BIN}/cython: bin/cython
	ln -sf ${CWD}/bin/cython ${BIN}/cython

# This is NOT the cython test suite, which is difficult to run due to using threads
# and probably doesn't work.  But we at least test something, which is building and
# running some of the demos.
test: wasm
	cd ${BUILD_WASM}/Demos \
		&& export PYTHONPATH=${DIST_WASM} \
		&& zython-debug setup.py build_ext --inplace \
		&& zython-debug run_primes.py 20 \
		&& zython-debug run_spam.py \
		&& zython-debug integrate_timing.py
