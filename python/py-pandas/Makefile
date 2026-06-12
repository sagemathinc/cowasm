include ../build/Makefile-vars

# https://github.com/pandas-dev/pandas/releases
VERSION=1.5.3

URL = https://github.com/pandas-dev/pandas/releases/download/v${VERSION}/pandas-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/pandas-${VERSION}.tar.gz
TARBALL_SHA256 = 74a3fd7e5a7ec052f183273dc7b0acd3a863edf7520f5d3a1765c04ffdb3b0b1

all: deps wasm

include ../build/Makefile-rules


PY_DATEUTIL = ${PACKAGES}/py-dateutil/dist/wasm
PY_PYTZ = ${PACKAGES}/py-pytz/dist/wasm
PY_SIX = ${PACKAGES}/py-six/dist/wasm
LIBCXX_WASM = ${PACKAGES}/../core/libcxx/dist/wasm
PYTHONPATH = $(shell cowasm-package-path @cowasm/py-cython):$(shell cowasm-package-path @cowasm/py-numpy):$(shell cowasm-package-path @cowasm/py-pip):${PACKAGES}/py-setuptools/dist/wasm:${PY_DATEUTIL}:${PY_PYTZ}:${PY_SIX}

# Attempting to use fully wasm and new pip, etc.   It's all broken though.

# TODO: this is a horrible hack right now, but it **works somewhat.**
#  - first do the install with setup.py install
#  - then install deps by doing "pip install pandas", which installs the
#    deps because pandas is already installed.
# This would break if pypi pandas is updated, but we haven't updated our
# package here yet, etc.  Not ideal.  This is just a first step.
${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-setup-no-pkg-resources.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.install:  ${BUILD_WASM}/.patched
	cd ../build && make zig
	# TODO: Now install pandas first via setup.py, then using pip to install
	# just the remaining dependencies.
	cd ${BUILD_WASM} \
		&& LDFLAGS="${LIBCXX_WASM}/libcxx.so" PYTHONPATH="${PYTHONPATH}" pnpm-exec cpython setup.py build
	rm -rf ${BUILD_WASM}/site-packages
	mkdir -p ${BUILD_WASM}/site-packages
	cp -a ${PY_DATEUTIL}/dateutil ${BUILD_WASM}/site-packages/
	cp -a ${PY_PYTZ}/pytz ${BUILD_WASM}/site-packages/
	cp -a ${PY_SIX}/six ${BUILD_WASM}/site-packages/
	touch ${BUILD_WASM}/.install


${DIST_WASM}/.built:  ${BUILD_WASM}/.install
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	find ${BUILD_WASM}/pandas -name '*cpython-311-wasm32-wasi.so' -delete
	cd ${BUILD_WASM} \
		&& pnpm-exec cpython -m cowasm_bundler pandas
	cd ${BUILD_WASM}/site-packages \
		&& pnpm-exec cpython -m cowasm_bundler pytz \
		&& pnpm-exec cpython -m cowasm_bundler dateutil dateutil/zoneinfo \
		&& pnpm-exec cpython -m cowasm_bundler six

	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/pandas.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/pytz.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/dateutil.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/six.tar.xz
	find ${DIST_WASM}/pandas -name '*.so' -exec dirname {} \; \
		| sort -u \
		| while read dir; do cp ${LIBCXX_WASM}/libcxx.so "$$dir/libcxx.so"; done
	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: deps ${DIST_WASM}/.built
	@PYTHONPATH="${DIST_WASM}:${PYTHONPATH}" pnpm-exec cpython -c "import pandas" && echo "Trivial PANDAS TEST PASSED!"
