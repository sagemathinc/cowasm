include ../build/Makefile-vars

all: deps wasm

# SageMath ships conway-polynomials as a standard finite-field data package.
VERSION = 0.10
WHEEL = conway_polynomials-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/33/9f/78052da6bda316d5105ea027de9978e92d81552dac8f87ca4267488a40d3/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = a354b4ac0a9985da75e2ac6ec6d7de2902396eff48913eeed86a962486171c28
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-vars-wheel

define WHEEL_BUILD
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/conway_polynomials ${DIST_WASM}/
	cp -r ${BUILD_WASM}/conway_polynomials-${VERSION}.dist-info ${DIST_WASM}/
endef

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}
	cp -r ${BUILD_WASM}/conway_polynomials ${DIST_WASI_SDK}/
	cp -r ${BUILD_WASM}/conway_polynomials-${VERSION}.dist-info ${DIST_WASI_SDK}/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} pnpm-exec cpython ${SRC}/test_conway_polynomials.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASI_SDK} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_conway_polynomials.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
