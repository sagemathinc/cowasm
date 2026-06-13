include ../build/Makefile-vars

all: deps ${DIST}/.built ${DIST}/fs.zip ${BIN}/dash-wasm

include ../build/Makefile-rules

USR = ${BUILD}/usr

CPYTHON = $(shell cowasm-package-path @cowasm/cpython)
PY_NUMPY = $(shell cowasm-package-path @cowasm/py-numpy)
PY_PACKAGING = $(shell cowasm-package-path @cowasm/py-packaging)
PY_PYPARSING = $(shell cowasm-package-path @cowasm/py-pyparsing)
PY_CYCLER = $(shell cowasm-package-path @cowasm/py-cycler)
PY_FONTTOOLS = $(shell cowasm-package-path @cowasm/py-fonttools)
PY_DATEUTIL = $(shell cowasm-package-path @cowasm/py-dateutil)
PY_PYTZ = $(shell cowasm-package-path @cowasm/py-pytz)
PY_SIX = $(shell cowasm-package-path @cowasm/py-six)
PY_KIWISOLVER = $(shell cowasm-package-path @cowasm/py-kiwisolver)
PY_MATPLOTLIB = $(shell cowasm-package-path @cowasm/py-matplotlib)

PYTHON_MAJOR = 3
PYTHON_MINOR = 14
PYTHON_LIB = python${PYTHON_MAJOR}.${PYTHON_MINOR}
PYTHON_WASM = python${PYTHON_MAJOR}.${PYTHON_MINOR}.wasm
PYTHON_SITE = ${USR}/lib/${PYTHON_LIB}

PYTHON_BUNDLE_INPUTS = \
	${CPYTHON}/bin/${PYTHON_WASM} \
	${CPYTHON}/lib/dist/python-stdlib.zip \
	${PY_NUMPY}/.built \
	${PY_PACKAGING}/.built \
	${PY_PYPARSING}/.built \
	${PY_CYCLER}/.built \
	${PY_FONTTOOLS}/.built \
	${PY_DATEUTIL}/.built \
	${PY_PYTZ}/.built \
	${PY_SIX}/.built \
	${PY_KIWISOLVER}/.built \
	${PY_MATPLOTLIB}/.built

${BUILD}/fs-updated: node_modules ${PYTHON_BUNDLE_INPUTS}
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
	cp -v ${USR}/bin/viz ${USR}/bin/vi
	cp -v $(shell cowasm-package-path @cowasm/man)/bin/man ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/ncurses)/bin/clear ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/ncurses)/bin/hanoi ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/rogue)/bin/rogue ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/sqlite)/bin/sqlite3 ${USR}/bin
	cp -v $(shell cowasm-package-path @cowasm/tar)/bin/tar ${USR}/bin
	cp -v ${CPYTHON}/bin/${PYTHON_WASM} ${USR}/bin/python

	# /share
	mkdir -p ${USR}/share
	cp -v ${SRC}/termcap ${USR}/share

	# /lib
	mkdir -p ${PYTHON_SITE}
	cd ${PYTHON_SITE} && unzip ${CPYTHON}/lib/dist/python-stdlib.zip
	cd ${PY_NUMPY} && tar -Jcf ${PYTHON_SITE}/numpy.tar.xz numpy
	cd ${PY_PACKAGING} && tar -Jcf ${PYTHON_SITE}/packaging.tar.xz packaging
	cd ${PY_PYPARSING} && tar -Jcf ${PYTHON_SITE}/pyparsing.tar.xz pyparsing
	cd ${PY_CYCLER} && tar -Jcf ${PYTHON_SITE}/cycler.tar.xz cycler
	cd ${PY_FONTTOOLS} && tar -Jcf ${PYTHON_SITE}/fontTools.tar.xz fontTools
	cd ${PY_DATEUTIL} && tar -Jcf ${PYTHON_SITE}/dateutil.tar.xz dateutil
	cd ${PY_PYTZ} && tar -Jcf ${PYTHON_SITE}/pytz.tar.xz pytz
	cd ${PY_SIX} && tar -Jcf ${PYTHON_SITE}/six.tar.xz six
	cd ${PY_KIWISOLVER} && tar -Jcf ${PYTHON_SITE}/kiwisolver.tar.xz kiwisolver
	cd ${PY_MATPLOTLIB} && tar -Jcf ${PYTHON_SITE}/matplotlib.tar.xz matplotlib mpl_toolkits pylab.py

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

${DIST}/.built: node_modules package.json tsconfig.json src/*.ts src/test/*.ts
	mkdir -p ${DIST}
	pnpm exec tsc
	touch ${DIST}/.built


###
# Testing
###

.PHONY: test
test: all
	pnpm run test
