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
export PYTHONPATH := ${CYTHON}

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/00-skip-cxx-test.patch | patch -p1 \
		&& cat ${SRC}/patches/01-ENH-Add-support-for-platforms-with-missing-fenv-flag.patch | patch -p1 \
		&& echo "" > numpy/core/include/setjmp.h \
		&& echo "" > numpy/core/include/execinfo.h
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& python-native tools/cythonize.py numpy/random/ \
		&& python-wasm-debug setup.py build_ext
	touch ${DIST_WASM}/.built


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	# nothing for now
	touch ${DIST_NATIVE}/.built