include ../build/Makefile-vars

all: deps ${DIST}/.built ${DIST}/fs.zip ${BIN}/dash-wasm

include ../build/Makefile-rules

USR = ${BUILD}/usr

CPYTHON = $(shell cowasm-package-path @cowasm/cpython)

${BUILD}/fs-updated: node_modules
	rm -rf ${USR}
	mkdir -p ${USR}/bin
	# /bin directory
	cp -v $(shell cowasm-package-path @cowasm/coreutils)/bin/* ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/dash)/bin/dash ${USR}/bin/sh
	cp -v $(shell cowasm-package-path @cowasm/bzip2)/bin/bzip2 ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/less)/bin/less ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/lua)/bin/lua ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/lzma)/bin/xz ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/viz)/bin/viz ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/man)/bin/man ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/ncurses)/bin/clear ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/ncurses)/bin/hanoi ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/rogue)/bin/rogue ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/sqlite)/bin/sqlite3 ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/tar)/bin/tar ${USR}/bin
	cp -v ${CPYTHON}/bin/python3.11.wasm ${USR}/bin/python

	# /share
	mkdir -p ${USR}/share
	cp -v ${SRC}/termcap ${USR}/share

	# /lib
	mkdir -p ${USR}/lib/python3.11
	cd ${USR}/lib/python3.11 && unzip ${CPYTHON}/lib/dist/python-stdlib.zip
	cd $(shell cowasm-package-path @cowasm/py-numpy) && tar -Jcf ${USR}/lib/python3.11/numpy.tar.xz numpy

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
	pnpm exec tsc
	touch ${DIST}/.built


###
# Testing
###

.PHONY: test
test: all
	pnpm run test
