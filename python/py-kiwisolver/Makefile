include ../build/Makefile-vars

all: deps wasm

VERSION = 1.5.0
URL = https://files.pythonhosted.org/packages/source/k/kiwisolver/kiwisolver-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/kiwisolver-${VERSION}.tar.gz
TARBALL_SHA256 = d4193f3d9dc3f6f79aaed0e5637f45d98850ebf01f7ca20e69457f3e8946b66a

include ../build/Makefile-rules

LIBCXX_WASM = $(shell cowasm-package-path @cowasm/libcxx)
PYTHONPATH = $(shell cowasm-package-path @cowasm/py-pip):$(shell cowasm-package-path @cowasm/py-cppy)

${BUILD_WASM}/.install: ${BUILD_WASM}/.build
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&& LDFLAGS="${LIBCXX_WASM}/libcxx.so" \
			PYTHONPATH=${PYTHONPATH} \
			pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.install

${DIST_WASM}/.built: ${BUILD_WASM}/.install
	cd ${BUILD_WASM}/build/lib* \
		&& pnpm-exec cpython -m cowasm_bundler kiwisolver
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/kiwisolver.tar.xz
	cp ${LIBCXX_WASM}/libcxx.so ${DIST_WASM}/kiwisolver/libcxx.so
	touch ${DIST_WASM}/.built

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM}:${PYTHONPATH} pnpm-exec cpython -c 'import kiwisolver; s = kiwisolver.Solver(); x = kiwisolver.Variable("x"); s.addConstraint(x == 3); s.updateVariables(); assert x.value() == 3'
