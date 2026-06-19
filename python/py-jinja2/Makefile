include ../build/Makefile-vars

all: deps wasm

JINJA2_VERSION = 3.1.6
MARKUPSAFE_VERSION = 3.0.3

JINJA2_WHEEL = jinja2-${JINJA2_VERSION}-py3-none-any.whl
JINJA2_URL = https://files.pythonhosted.org/packages/62/a1/3d680cbfd5f4b8f15abc1d571870c5fc3e594bb582bc3b64ea099db13e56/${JINJA2_WHEEL}
JINJA2_TARBALL = ${UPSTREAM}/${JINJA2_WHEEL}
JINJA2_TARBALL_SHA256 = 85ece4451f492d0c13c5dd7c13a64681a86afae63a5f347908daf103ce6d2f67

MARKUPSAFE_TARBALL_NAME = markupsafe-${MARKUPSAFE_VERSION}.tar.gz
MARKUPSAFE_URL = https://files.pythonhosted.org/packages/7e/99/7690b6d4034fffd95959cbe0c02de8deb3098cc577c67bb6a24fe5d7caa7/${MARKUPSAFE_TARBALL_NAME}
MARKUPSAFE_TARBALL = ${UPSTREAM}/${MARKUPSAFE_TARBALL_NAME}
MARKUPSAFE_TARBALL_SHA256 = 722695808f4b6457b320fdc131280796bdceb04ab50fe1795cd540799ebe1698

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: deps
deps: node_modules

${JINJA2_TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${JINJA2_URL} -o ${JINJA2_TARBALL}
	echo "${JINJA2_TARBALL_SHA256}  ${JINJA2_TARBALL}" | sha256sum -c

${MARKUPSAFE_TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${MARKUPSAFE_URL} -o ${MARKUPSAFE_TARBALL}
	echo "${MARKUPSAFE_TARBALL_SHA256}  ${MARKUPSAFE_TARBALL}" | sha256sum -c

${BUILD_WASM}/.build: ${JINJA2_TARBALL} ${MARKUPSAFE_TARBALL}
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}/jinja2 ${BUILD_WASM}/markupsafe
	python3 -m zipfile -e ${JINJA2_TARBALL} ${BUILD_WASM}/jinja2
	tar xf ${MARKUPSAFE_TARBALL} -C ${BUILD_WASM}/markupsafe --strip-components=1
	touch ${BUILD_WASM}/.build

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/jinja2/jinja2 ${DIST_WASM}/
	cp -r ${BUILD_WASM}/jinja2/jinja2-${JINJA2_VERSION}.dist-info ${DIST_WASM}/
	cp -r ${BUILD_WASM}/markupsafe/src/markupsafe ${DIST_WASM}/
	find ${DIST_WASM} -name '_speedups.*' -delete
	touch ${DIST_WASM}/.built

node_modules:
	pnpm install
	mkdir -p node_modules

test: ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} python3 -c 'from jinja2 import Template; assert Template("{{ 2 + 3 }}").render() == "5"'

.PHONY: clean-wasm
clean-wasm:
	rm -rf ${BUILD_WASM} ${DIST_WASM}

.PHONY: clean
clean: clean-wasm
	rm -rf ${BUILD} ${DIST} node_modules
