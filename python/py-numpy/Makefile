include ../build/Makefile-vars

# See https://github.com/numpy/numpy/releases
VERSION=1.23.4

URL = https://github.com/numpy/numpy/releases/download/v${VERSION}/numpy-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/numpy-${VERSION}.tar.gz

CYTHON = ${PACKAGES}/py-cython/dist/wasm

all: wasm

include ../build/Makefile-rules

# NOTES:
#   - we put fake-bin at the front of the PATH, since build/wasm/numpy/distutils/system_info.py
#     explicitly tries to call gcc on the system to get info about the system, and this will hang
#     or be very misleading.  Instead we put a fake gcc that runs the zig clang wasm32-wasi
#     cross compiler.

export PATH := ${SRC}/fake-bin:$(PATH)

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/01-ENH-Add-support-for-platforms-with-missing-fenv-flag.patch | patch -p1 \
		&& cat ${SRC}/patches/03-disable-complex.patch | patch -p1 \
		&& cat ${SRC}/patches/04-random-no-lm.patch | patch -p1 \
		&& cat ${SRC}/patches/05-no-backtrace.patch | patch -p1 \
		&& cat ${SRC}/patches/06-setup-setuptools.patch | patch -p1 \
		&& echo "" > numpy/core/include/setjmp.h \
		&& echo "" > numpy/core/include/execinfo.h
	touch ${BUILD_WASM}/.patched

# NOTES:
#  - We have to include  numpy/core/multiarray.py in addition to the automatic
#    numpy/core/multiarray.pyc, since numpy uses __doc__ attributes from
#    things in  numpy/core/multiarray.py to create the docstrings on the
#    numpy module, and that data seems to not be in the pyc file.
#  - We do not include numpy headers.  They are needed for building other packages, e.g.,
#    pandas or a Demo about numpy in the Cython source.  Instead, for *building* packages
#    we also use `python-wasm setup.py install` to install numpy to site-packages in the cpython package.
#    Basically a full build-from source dev setup is needed for building packages from source.
#  - We do NOT use cowasm-opt, since it makes the so *larger*.
#  - We "python setup.py install" (and not just build) because dependencies
#    such as pandas expect a full install in place (with all headers) in
#    order to compile themselves.

PYTHONPATH = $(shell cowasm-package-path @cowasm/py-pip):$(shell cowasm-package-path @cowasm/py-cython)

${BUILD_WASM}/.lib: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	# TODO: We install rather than just build *solely* so that
	# pip install with pandas doesn't try to install numpy later.
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PYTHONPATH} npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.lib

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.lib
	cd ${BUILD_WASM}/build/lib* \
		&& rm -rf numpy/core/include \
		&& cp -rv ../src*/numpy/core/include numpy/core/ \
		&& npx @cowasm/cpython -m cowasm_bundler numpy numpy/core/multiarray.py numpy/core/include
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/numpy.tar.xz
	# The include files are needed to building anything that depends on numpy, and they aren't
	# in the bundle.  These are in addition to the numpy/core/include files in the build,
	# which we get above.
	cp -r ${BUILD_WASM}/numpy/core/include/* ${DIST_WASM}/numpy/core/include/
	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: ${DIST_WASM}/.built
	rm -rf ${BUILD_WASM}/cowasm-test
	mkdir -p ${BUILD_WASM}/cowasm-test
	@cd ${BUILD_WASM}/cowasm-test \
		&& PYTHONPATH=${DIST_WASM} npx @cowasm/cpython -c "import numpy; print(numpy.array([3,8,9,5,0,7,7]).sum())" | grep 39 \
		&& echo "NUMPY TEST PASSED!"
