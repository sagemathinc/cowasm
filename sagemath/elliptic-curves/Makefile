include ../build/Makefile-vars

all: wasm

# SageMath ships elliptic_curves as the standard small elliptic-curve databases.
VERSION = 0.8.1
URL = https://mirrors.mit.edu/sage/spkg/upstream/elliptic_curves/elliptic_curves-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/elliptic_curves-${VERSION}.tar.bz2
TARBALL_SHA256 = 5fba5470d9d91f06282ed5edfc45bf0ea1c5f7c8d4837c46234b17be1481fd50
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/elliptic_curves
	cp -R ${BUILD_WASM}/common ${DIST_WASM}/share/elliptic_curves/
	cp -R ${BUILD_WASM}/ellcurves ${DIST_WASM}/share/elliptic_curves/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/elliptic_curves
	cp -R ${BUILD_WASM}/common ${DIST_WASI_SDK}/share/elliptic_curves/
	cp -R ${BUILD_WASM}/ellcurves ${DIST_WASI_SDK}/share/elliptic_curves/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_ELLIPTIC_CURVES_DATA=${DIST_WASM}/share/elliptic_curves pnpm-exec cpython ${SRC}/test_elliptic_curves.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_ELLIPTIC_CURVES_DATA=${DIST_WASI_SDK}/share/elliptic_curves ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_elliptic_curves.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
