include ../build/Makefile-vars

# See https://github.com/numpy/numpy/releases
VERSION=1.23.3

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


# NOTE: This 02-cxx_compiler.patch will go away as soon as we switch away from the zig-fPIC script.

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/01-ENH-Add-support-for-platforms-with-missing-fenv-flag.patch | patch -p1 \
		&& cat ${SRC}/patches/02-cxx_compiler.patch | patch -p1 \
		&& cat ${SRC}/patches/03-disable-complex.patch | patch -p1 \
		&& cat ${SRC}/patches/04-random-no-lm.patch | patch -p1 \
		&& cat ${SRC}/patches/05-no-backtrace.patch | patch -p1 \
		&& echo "" > numpy/core/include/setjmp.h \
		&& echo "" > numpy/core/include/execinfo.h
	touch ${BUILD_WASM}/.patched

# NOTES:
#  - We have to include  numpy/core/multiarray.py in addition to the automatic
#    numpy/core/multiarray.pyc, since numpy uses __doc__ attributes from
#    things in  numpy/core/multiarray.py to create the docstrings on the
#    numpy module, and that data seems to not be in the pyc file.
#  - We are careful to include the numpy C headers below, which is the
#    right thing to do.  However, don't expect this to fully work yet, e.g.,
#    there is a Demo about numpy in the Cython source and it fails
#    due to other missing posix things (TODO).
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	mkdir -p ${DIST_WASM}
	cd ${PACKAGES}/cpython && make pip
	cd ${BUILD_WASM} \
		&& zython-debug setup.py build
	cd ${BUILD_WASM}/build/lib* \
		&& rm -rf numpy/core/include \
		&& cp -rv ../src*/numpy/core/include numpy/core/ \
		&& python-native -m zython_bundler numpy numpy/core/multiarray.py numpy/core/include \
		&& mkdir -p ${DIST_WASM} \
		&& cp numpy.* ${DIST_WASM}

	# TODO: temporary bootstraping to install:
	cd ${PACKAGES}/python-wasm && make packages

	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: ${DIST_WASM}/.built
	rm -rf ${BUILD_WASM}/zython-test
	mkdir -p ${BUILD_WASM}/zython-test
	cd ${BUILD_WASM}/zython-test \
		&& zython-dev -c "import numpy; print(numpy.array([3,8,9,5,0,7,7]).sum())" | grep 39 \
		&& echo "NUMPY TEST PASSED!"

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	# nothing for now
	touch ${DIST_NATIVE}/.built

