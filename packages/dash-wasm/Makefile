include ../build/Makefile-vars

all: ${DIST}/.built ${DIST}/dash.wasm ${DIST}/fs.zip

include ../build/Makefile-rules

DASH = ${PACKAGES}/dash/dist/wasm

${DIST}/dash.wasm: ${DASH}/bin/dash
	mkdir -p ${DIST}
	cp $< $@

FS = ${BUILD}/vfs

${BUILD}/fs-updated: ${PACKAGES}/coreutils/dist/wasm/bin/ls  \
		${PACKAGES}/cpython/dist/wasm/lib/dist/python-stdlib.zip \
		${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm # more deps!
	rm -rf {FS}
	mkdir -p ${FS}/usr/bin
	# /bin directory
	cp -v ${DIST}/dash.wasm ${FS}/usr/bin/sh
	cp -v ${PACKAGES}/coreutils/dist/wasm/bin/* ${FS}/usr/bin
	cp -v ${PACKAGES}/bzip2/dist/wasm/bin/bzip2 ${FS}/usr/bin
	cp -v ${PACKAGES}/lua/dist/wasm/bin/lua ${FS}/usr/bin
	cp -v ${PACKAGES}/viz/dist/wasm/bin/viz ${FS}/usr/bin
	cp -v ${PACKAGES}/man/dist/wasm/bin/man ${FS}/usr/bin
	cp -v ${PACKAGES}/sqlite/dist/wasm/bin/sqlite3 ${FS}/usr/bin
	cp -v ${PACKAGES}/libarchive/dist/wasm/bin/tar ${FS}/usr/bin
	cp -v ${PACKAGES}/ncurses/dist/wasm/bin/hanoi ${FS}/usr/bin
	cp -v ${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm ${FS}/usr/bin/python3

	# /share
	mkdir -p ${FS}/usr/share
	cp -v ${PACKAGES}/cpython/src/termcap ${FS}/usr/share

	# /lib
	mkdir -p ${FS}/usr/lib/python3.11
	cd ${FS}/usr/lib/python3.11 && unzip ${PACKAGES}/cpython/dist/wasm/lib/dist/python-stdlib.zip

	touch ${BUILD}/fs-updated

${DIST}/fs.zip: ${BUILD}/fs-updated
	mkdir -p ${DIST}
	rm -f ${DIST}/fs.zip
	cd ${FS} && zip ${DIST}/fs.zip -r .

# what I really want -- vastly better compression size.
${DIST}/fs.tar.xz: ${BUILD}/fs-updated
	mkdir -p ${DIST}
	rm -f ${DIST}/fs.tar.xz
	cd ${FS} && tar Jcvf ${DIST}/fs.tar.xz .


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
