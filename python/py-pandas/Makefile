include ../build/Makefile-vars

# https://github.com/pandas-dev/pandas/releases
VERSION=1.5.3

URL = https://github.com/pandas-dev/pandas/releases/download/v${VERSION}/pandas-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/pandas-${VERSION}.tar.gz

all: deps wasm

include ../build/Makefile-rules


PYTHONPATH = $(shell cowasm-package-path @cowasm/py-cython):$(shell cowasm-package-path @cowasm/py-numpy):$(shell cowasm-package-path @cowasm/py-pip)

# Attempting to use fully wasm and new pip, etc.   It's all broken though.

# TODO: this is a horrible hack right now, but it **works somewhat.**
#  - first do the install with setup.py install
#  - then install deps by doing "pip install pandas", which installs the
#    deps because pandas is already installed.
# This would break if pypi pandas is updated, but we haven't updated our
# package here yet, etc.  Not ideal.  This is just a first step.
${BUILD_WASM}/.install:  ${BUILD_WASM}/.build
	cd ../build && make zig
	# TODO: Now install pandas first via setup.py, then using pip to install
	# just the remaining dependencies.
	cd ${BUILD_WASM} \
		&& PYTHONPATH="${PYTHONPATH}" pnpm-exec cpython setup.py build
	PYTHONPATH="${PYTHONPATH}" pnpm-exec cpython -m pip install --target ${BUILD_WASM}/site-packages python-dateutil pytz
	touch ${BUILD_WASM}/.install


${DIST_WASM}/.built:  ${BUILD_WASM}/.install
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD_WASM} \
		&& pnpm-exec cpython -m cowasm_bundler pandas
	cd ${BUILD_WASM}/site-packages \
		&& pnpm-exec cpython -m cowasm_bundler pytz pytz/zoneinfo \
		&& pnpm-exec cpython -m cowasm_bundler dateutil dateutil/zoneinfo \
		&& mkdir -p six && cp six.py six/__init__.py && pnpm-exec cpython -m cowasm_bundler six

	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/pandas.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/pytz.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/dateutil.tar.xz
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/site-packages/six.tar.xz
	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: deps ${DIST_WASM}/.built
	@PYTHONPATH="${DIST_WASM}:${PYTHONPATH}" pnpm-exec cpython -c "import pandas" && echo "Trivial PANDAS TEST PASSED!"

