include ../build/Makefile-vars

all: wasm

# SageMath ships database_mutation_class as finite mutation class data.
VERSION = 1.0
UPSTREAM_NAME = database_mutation_class
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 5105eed820e469bc0645788e23a47ff19420d3e398f5866df1424a05c67ee067
DIST_WASI_SDK = ${DIST}/wasi-sdk

include ../build/Makefile-rules

MUTATION_FILES = mutation_classes_10.dig6 mutation_classes_2.dig6 mutation_classes_3.dig6 mutation_classes_4.dig6 mutation_classes_5.dig6 mutation_classes_6.dig6 mutation_classes_7.dig6 mutation_classes_8.dig6 mutation_classes_9.dig6

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/mutation_class
	cp $(addprefix ${BUILD_WASM}/src/,${MUTATION_FILES}) ${DIST_WASM}/share/mutation_class/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/mutation_class
	cp $(addprefix ${BUILD_WASM}/src/,${MUTATION_FILES}) ${DIST_WASI_SDK}/share/mutation_class/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_MUTATION_CLASS_DATA=${DIST_WASM}/share/mutation_class pnpm-exec cpython ${SRC}/test_mutation_class.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_MUTATION_CLASS_DATA=${DIST_WASI_SDK}/share/mutation_class pnpm-exec cpython ${SRC}/test_mutation_class.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
