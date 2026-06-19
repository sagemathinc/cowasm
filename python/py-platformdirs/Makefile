include ../build/Makefile-vars

all: wasm

VERSION = 4.10.0
WHEEL = platformdirs-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/81/e6/cd9575ac904136b3cbf7aa7ee819ef86eedb7274e46f230e94ea4342e729/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = fb516cdb12eb0d857d0cd85a7c57cea4d060bee4578d6cf5a14dfdf8cbf8784a

TOP_LEVEL = platformdirs

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: fetch-source
fetch-source: ${TARBALL}
	$(verify_tarball_sha256)

${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${URL} -o ${TARBALL}
	$(verify_tarball_sha256)

${BUILD_WASM}/.build: ${TARBALL}
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	python3 -m zipfile -e ${TARBALL} ${BUILD_WASM}
	touch ${BUILD_WASM}/.build

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/${TOP_LEVEL} ${DIST_WASM}/
	cp -r ${BUILD_WASM}/${TOP_LEVEL}-${VERSION}.dist-info ${DIST_WASM}/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} python3 -c 'import platformdirs; assert platformdirs.user_cache_dir("CoWasm")'

.PHONY: clean-wasm
clean-wasm:
	rm -rf ${BUILD_WASM} ${DIST_WASM}

.PHONY: clean
clean: clean-wasm
	rm -rf ${BUILD} ${DIST} node_modules
