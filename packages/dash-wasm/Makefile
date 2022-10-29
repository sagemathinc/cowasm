include ../build/Makefile-vars

all: ${DIST}/.built ${DIST}/dash.wasm ${DIST}/bin.zip

include ../build/Makefile-rules

DASH = ${PACKAGES}/dash/dist/wasm

${DIST}/dash.wasm: ${DASH}/bin/dash
	mkdir -p ${DIST}
	cp $< $@

${BUILD}/.bin: ${PACKAGES}/coreutils/dist/wasm/bin/ls  ${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm # more deps!
	mkdir -p ${BUILD}/bin
	cp -v ${PACKAGES}/coreutils/dist/wasm/bin/* ${BUILD}/bin/
	cp -v ${PACKAGES}/bzip2/dist/wasm/bin/bzip2 ${BUILD}/bin/
	cp -v ${PACKAGES}/lua/dist/wasm/bin/lua ${BUILD}/bin/
	cp -v ${PACKAGES}/viz/dist/wasm/bin/viz ${BUILD}/bin/
	cp -v ${PACKAGES}/man/dist/wasm/bin/man ${BUILD}/bin/
	cp -v ${PACKAGES}/sqlite/dist/wasm/bin/sqlite3 ${BUILD}/bin/
	cp -v ${PACKAGES}/libarchive/dist/wasm/bin/tar ${BUILD}/bin/
	cp -v ${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm ${BUILD}/bin/python
	touch ${BUILD}/.bin

${DIST}/bin.zip: ${BUILD}/.bin
	mkdir -p ${DIST}
	cd ${BUILD}/bin && zip ${DIST}/bin.zip -r .

# what I really want -- vastly better compression size.
${DIST}/bin.tar.xz: ${BUILD}/.bin
	mkdir -p ${DIST}
	cd ${BUILD}/bin && tar Jcvf ${DIST}/bin.tar.xz .


###
# Node related makefile wrapping...
###

node_modules:
	npm ci

${DIST}/.built: node_modules
	mkdir -p ${DIST}
	npx tsc
	touch ${DIST}/.built


###
# Testing
###

.PHONY: test
test: all
	echo "no tests yet"
	#npm run test
