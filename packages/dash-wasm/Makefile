include ../build/Makefile-vars

all: ${DIST}/.built ${DIST}/dash.wasm ${DIST}/fs.zip ${BIN}/dash-wasm

include ../build/Makefile-rules

DASH = ${PACKAGES}/dash/dist/wasm

${DIST}/dash.wasm: ${DASH}/bin/dash
	mkdir -p ${DIST}
	cp $< $@

USR = ${BUILD}/usr

NCURSES = $(shell cowasm-package-path @cowasm/ncurses)
CPYTHON = $(shell cowasm-package-path @cowasm/cpython)

${BUILD}/fs-updated: node_modules ${PACKAGES}/coreutils/dist/wasm/bin/ls
	rm -rf ${USR}
	mkdir -p ${USR}/bin
	# /bin directory
	cp -v ${DIST}/dash.wasm ${USR}/bin/sh
	cp -v $(shell cowasm-package-path @cowasm/coreutils)/bin/* ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/bzip2)/bin/bzip2 ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/lzma)/bin/xz ${USR}/bin
	cp -v ${PACKAGES}/lua/dist/wasm/bin/lua ${USR}/bin
	cp -v ${PACKAGES}/viz/dist/wasm/bin/viz ${USR}/bin
	cp -v ${PACKAGES}/less/dist/wasm/bin/less ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/man)/bin/man ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/sqlite)/bin/sqlite3 ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/tar)/bin/tar ${USR}/bin
	cp -v ${NCURSES}/bin/clear ${USR}/bin
	cp -v ${NCURSES}/bin/hanoi ${USR}/bin
	cp -v ${PACKAGES}/rogue/dist/wasm/bin/rogue ${USR}/bin
	cp -v ${CPYTHON}/bin/python3.11.wasm ${USR}/bin/python

	# /share
	mkdir -p ${USR}/share
	cp -v ${PACKAGES}/cpython/src/termcap ${USR}/share

	# /lib
	mkdir -p ${USR}/lib/python3.11
	cd ${USR}/lib/python3.11 && unzip ${CPYTHON}/lib/dist/python-stdlib.zip
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

${BIN}/dash-wasm: ${CWD}/bin/dash-wasm
	ln -sf ${CWD}/bin/dash-wasm ${BIN}/dash-wasm

###
# Node related makefile wrapping...
###

${DIST}/.built: node_modules
	mkdir -p ${DIST}
	npx tsc
	touch ${DIST}/.built


###
# Testing
###

.PHONY: test
test: all
	npm run test
