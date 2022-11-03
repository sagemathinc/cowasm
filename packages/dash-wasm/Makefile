include ../build/Makefile-vars

all: ${DIST}/.built ${DIST}/dash.wasm ${DIST}/fs.zip

include ../build/Makefile-rules

DASH = ${PACKAGES}/dash/dist/wasm

${DIST}/dash.wasm: ${DASH}/bin/dash
	mkdir -p ${DIST}
	cp $< $@

USR = ${BUILD}/usr

${BUILD}/fs-updated: ${PACKAGES}/coreutils/dist/wasm/bin/ls  \
		${PACKAGES}/cpython/dist/wasm/lib/dist/python-stdlib.zip \
		${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm # more deps!
	rm -rf ${USR}
	mkdir -p ${USR}/bin
	# /bin directory
	cp -v ${DIST}/dash.wasm ${USR}/bin/sh
	cp -v ${PACKAGES}/coreutils/dist/wasm/bin/* ${USR}/bin
	cp -v ${PACKAGES}/bzip2/dist/wasm/bin/bzip2 ${USR}/bin
	cp -v ${PACKAGES}/lua/dist/wasm/bin/lua ${USR}/bin
	cp -v ${PACKAGES}/viz/dist/wasm/bin/viz ${USR}/bin
	cp -v ${PACKAGES}/man/dist/wasm/bin/man ${USR}/bin
	cp -v ${PACKAGES}/sqlite/dist/wasm/bin/sqlite3 ${USR}/bin
	cp -v ${PACKAGES}/libarchive/dist/wasm/bin/tar ${USR}/bin
	cp -v ${PACKAGES}/ncurses/dist/wasm/bin/hanoi ${USR}/bin
	cp -v ${PACKAGES}/cpython/dist/wasm/bin/python3.11.wasm ${USR}/bin/python

	# /share
	mkdir -p ${USR}/share
	cp -v ${PACKAGES}/cpython/src/termcap ${USR}/share

	# /lib
	mkdir -p ${USR}/lib/python3.11
	cd ${USR}/lib/python3.11 && unzip ${PACKAGES}/cpython/dist/wasm/lib/dist/python-stdlib.zip
	cp -v ${PACKAGES}/py-numpy/dist/wasm/numpy.tar.xz ${USR}/lib/python3.11

	touch ${BUILD}/fs-updated

${DIST}/fs.zip: ${BUILD}/fs-updated
	mkdir -p ${DIST}
	rm -f ${DIST}/fs.zip
	cd ${USR} && zip --symlinks ${DIST}/fs.zip -r .

# what I really want -- vastly better compression size.
${DIST}/fs.tar.xz: ${BUILD}/fs-updated
	mkdir -p ${DIST}
	rm -f ${DIST}/fs.tar.xz
	cd ${USR} && tar Jcvf ${DIST}/fs.tar.xz .


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
