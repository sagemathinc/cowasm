include ../build/Makefile-vars

all: deps wasm

# See https://pypi.org/project/gmpy2/
VERSION = 2.3.0
URL = https://files.pythonhosted.org/packages/source/g/gmpy2/gmpy2-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/gmpy2-${VERSION}.tar.gz
TARBALL_SHA256 = 2d943cc9051fcd6b15b2a09369e2f7e18c526bc04c210782e4da61b62495eb4a
PATCHES = $(sort $(wildcard ${SRC}/patches/*.patch))

include ../build/Makefile-rules

GMP_WASM = ${CWD}/../../sagemath/gmp/dist/wasm
MPFR_WASM = ${CWD}/../../sagemath/mpfr/dist/wasm
MPC_WASM = ${CWD}/../../sagemath/mpc/dist/wasm
PYTHONPATH = $(shell cowasm-package-path @cowasm/py-pip):$(shell cowasm-package-path @cowasm/py-setuptools)
PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm/bin/python3.wasm
STATIC_PREFIX = ${BUILD_WASM}/cowasm-static

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	for patch in ${PATCHES}; do patch -d ${BUILD_WASM} -p1 < "$$patch"; done
	# Keep gmpy2's C API capsule enabled for downstream Cython modules while
	# still linking the GMP/MPFR/MPC libraries from the local static prefix.
	sed -i'.cowasm-original' -e "/self.static_dir:/,+4{/DSHARED=1/d; /DSTATIC=1/d;}" ${BUILD_WASM}/setup.py
	touch ${BUILD_WASM}/.patched

${GMP_WASM}/lib/libgmp.a:
	$(MAKE) -C ${CWD}/../../sagemath/gmp wasm

${MPFR_WASM}/lib/libmpfr.a:
	$(MAKE) -C ${CWD}/../../sagemath/mpfr wasm

${MPC_WASM}/lib/libmpc.a:
	$(MAKE) -C ${CWD}/../../sagemath/mpc wasm

${BUILD_WASM}/.static-prefix: ${GMP_WASM}/lib/libgmp.a ${MPFR_WASM}/lib/libmpfr.a ${MPC_WASM}/lib/libmpc.a ${BUILD_WASM}/.patched
	rm -rf ${STATIC_PREFIX}
	mkdir -p ${STATIC_PREFIX}/include ${STATIC_PREFIX}/lib
	cp -a ${GMP_WASM}/include/. ${STATIC_PREFIX}/include/
	cp -a ${MPFR_WASM}/include/. ${STATIC_PREFIX}/include/
	cp -a ${MPC_WASM}/include/. ${STATIC_PREFIX}/include/
	cp -a ${GMP_WASM}/lib/libgmp.a ${STATIC_PREFIX}/lib/
	cp -a ${MPFR_WASM}/lib/libmpfr.a ${STATIC_PREFIX}/lib/
	cp -a ${MPC_WASM}/lib/libmpc.a ${STATIC_PREFIX}/lib/
	touch ${BUILD_WASM}/.static-prefix

${BUILD_WASM}/.install: ${BUILD_WASM}/.static-prefix
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&& SETUPTOOLS_SCM_PRETEND_VERSION=${VERSION} \
			PYTHONPATH=${PYTHONPATH} \
			pnpm-exec cpython setup.py build_ext --static-dir=${STATIC_PREFIX} build
	sed -i'.original' -e 's/^Version: .*/Version: ${VERSION}/' ${BUILD_WASM}/gmpy2.egg-info/PKG-INFO
	touch ${BUILD_WASM}/.install

${DIST_WASM}/.built: ${BUILD_WASM}/.install
	cd ${BUILD_WASM}/build/lib* \
		&& pnpm-exec cpython -m cowasm_bundler gmpy2
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/gmpy2.tar.xz
	cp -a ${BUILD_WASM}/gmpy2.egg-info ${DIST_WASM}/
	cd ${BUILD_WASM} \
		&& find gmpy2 -type f \( -name '*.pxd' -o -name '*.h' \) -print \
		| tar cf - -T - \
		| tar xf - -C ${DIST_WASM}
	touch ${DIST_WASM}/.built

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython ${SRC}/test_gmpy2.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_gmpy2.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone
