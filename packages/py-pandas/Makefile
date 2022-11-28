include ../build/Makefile-vars

# https://github.com/pandas-dev/pandas/releases
VERSION=1.5.1

URL = https://github.com/pandas-dev/pandas/releases/download/v${VERSION}/pandas-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/pandas-${VERSION}.tar.gz

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/00-no-ctypes.patch | patch -p1
	touch ${BUILD_WASM}/.patched


PYTHONPATH = $(shell cowasm-package-path @cowasm/cython):$(shell cowasm-package-path @cowasm/numpy)

# TODO: this is a horrible hack right now, but it **works somewhat.**
#  - first do the install with setup.py install
#  - then install deps by doing "pip install pandas", which installs the
#    deps because pandas is already installed.
# This would break if pypi pandas is updated, but we haven't updated our
# package here yet, etc.  Not ideal.  This is just a first step.
${BUILD_WASM}/.install: node_modules ${BUILD_WASM}/.patched
	mkdir -p ${DIST_WASM}
	# TODO: ugh
	cd ../cpython && make pip
	# TODO: This is a hack right now so that pip install pandas doesn't try to build numpy
	cd ../py-numpy && make
	# TODO: Now install pandas first via setup.py, then using pip to install
	# just the remaining dependencies.
	cd ${BUILD_WASM} \
		&& PYTHONPATH="${PYTHONPATH}" python-wasm setup.py install \
		&& python-wasm -m pip install pandas || true \
		&& python-wasm -m pip install pandas
	touch ${BUILD_WASM}/.install

${DIST_WASM}/.built: ${BUILD_WASM}/.install
	cd ../cpython && make native  # TODO: python-wasm doesn't work with cowasm_bundler *yet*.
	cd ${BUILD_WASM}/build/lib* \
		&& rm -rf pandas/tests \
		&& python-native -m cowasm_bundler pandas \
		&& mkdir -p ${DIST_WASM} \
		&& mv pandas.tar.xz ${DIST_WASM}
	cd ${PACKAGES}/cpython/dist/wasm/lib/python3.11/site-packages \
		&& python-native -m cowasm_bundler pytz pytz/zoneinfo && mv pytz.tar.xz ${DIST_WASM} \
		&& python-native -m cowasm_bundler dateutil dateutil/zoneinfo && mv dateutil.tar.xz ${DIST_WASM} \
		&& mkdir -p six && cp six.py six/__init__.py && python-native -m cowasm_bundler six && mv six.tar.xz ${DIST_WASM}
	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: ${DIST_WASM}/.built
	rm -rf ${BUILD_WASM}/cowasm-test
	mkdir -p ${BUILD_WASM}/cowasm-test
	@cd ${BUILD_WASM}/cowasm-test \
		&& PYTHONPATH="${PYTHONPATH}:${DIST_WASM}" python-wasm -c "import pandas" \
		&& echo "Trivial PANDAS TEST PASSED!"

