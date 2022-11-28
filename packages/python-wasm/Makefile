include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
OPT     = -OReleaseSmall
# OPT     = -ODebug

all: node_modules ${DIST}/.built python

include ../build/Makefile-rules

CPYTHON = $(shell cowasm-package-path @cowasm/cpython)
POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
DYLINK = $(shell cowasm-package-path dylink)

CFLAGS = -I$(shell cowasm-package-path @cowasm/cpython)/include/python3.11 -I$(shell cowasm-package-path @cowasm/posix-wasm)
LDFLAGS = -L$(shell cowasm-package-path @cowasm/cpython)/lib -lpython3.11

###
# Python as a web assembly library with a few extras compiled in
# needed be usable.
###

${BUILD}/libpython.o:
	mkdir -p ${BUILD}
	cd ../zig && make
	${BIN}/cowasm-cc -Oz ${CFLAGS} \
		-c ${DYLINK}/wasm-export/libpython.c \
		-o ${BUILD}/libpython.o

${DIST}/python.wasm: node_modules src/python.zig src/signal.zig ${BUILD}/libpython.o
	cd ../zig && make
	mkdir -p ${DIST}
	cd src/ \
		&& ${BIN}/cowasm-zig \
			${OPT} \
			${CFLAGS} \
			${LDFLAGS} \
			python.zig \
			${BUILD}/libpython.o \
		&& rm python.o \
		&& mv python.wasm ${DIST}/python.wasm

BUNDLES = ${DIST}/python-minimal.zip ${DIST}/python-readline.zip ${DIST}/python-stdlib.zip ${DIST}/python-everything.zip


${DIST}/python-minimal.zip: node_modules
	mkdir -p ${DIST}
	cp ${CPYTHON}/lib/dist/python-minimal.zip ${DIST}

${DIST}/python-readline.zip: node_modules
	mkdir -p ${DIST}
	cp ${CPYTHON}/lib/dist/python-readline.zip ${DIST}

${DIST}/python-stdlib.zip: node_modules
	mkdir -p ${DIST}
	cp ${CPYTHON}/lib/dist/python-stdlib.zip ${DIST}

PYTHON_PACKAGES = ${DIST}/Cython.tar.xz ${DIST}/mpmath.tar.xz ${DIST}/numpy.tar.xz ${DIST}/sympy.tar.xz ${DIST}/pandas.tar.xz ${DIST}/pytz.tar.xz ${DIST}/dateutil.tar.xz ${DIST}/six.tar.xz

${DIST}/Cython.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/cython)/Cython.tar.xz ${DIST}

${DIST}/mpmath.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/mpmath)/mpmath.tar.xz ${DIST}

${DIST}/numpy.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/numpy)/numpy.tar.xz ${DIST}

${DIST}/pandas.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/pandas)/pandas.tar.xz ${DIST}

${DIST}/pytz.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/pandas)/pytz.tar.xz ${DIST}

${DIST}/dateutil.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/pandas)/dateutil.tar.xz ${DIST}

${DIST}/six.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/pandas)/six.tar.xz ${DIST}

${DIST}/sympy.tar.xz: node_modules
	mkdir -p ${DIST}
	cp $(shell cowasm-package-path @cowasm/sympy)/sympy.tar.xz ${DIST}/

${DIST}/python-everything.zip: ${DIST}/python-stdlib.zip ${PYTHON_PACKAGES} ${DIST}/python.wasm
	cd ${DIST} \
		&&	cp python-stdlib.zip .python-everything.zip \
		&&  zip .python-everything.zip *.tar.xz python.wasm \
		&&  mv .python-everything.zip python-everything.zip



.PHONY: python
python: ${DIST}/python.wasm hello hellozig ${BUNDLES} ${PYTHON_PACKAGES}


###
# An example minimal Python extension module, written in C.
###

PLATFORM = cpython-311-wasm32-wasi

${DIST}/hello.${PLATFORM}.so: src/extension/hellomodule.c
	cd ../zig && make
	${BIN}/cowasm-cc -Oz ${CFLAGS} -shared  \
		src/extension/hellomodule.c -o ${DIST}/hello.${PLATFORM}.so

.PHONEY: hello
hello: ${DIST}/hello.${PLATFORM}.so

###
# An example minimal Python extension module, written in Zig.
###

${DIST}/hellozig.${PLATFORM}.so: src/extension/hellozigmodule.zig src/extension/hellozigmodule.c
	cd ../zig && make
	cd src/extension \
		&&	${BIN}/cowasm-cc ${CFLAGS} -Oz -c hellozigmodule.c -o hellozigmodule-c.o \
		&&	${BIN}/cowasm-zig -v ${CFLAGS} ${OPT} hellozigmodule-c.o hellozigmodule.zig \
		&&	rm hellozigmodule-c.o \
		&&  mv hellozigmodule.wasm ${DIST}/hellozig.${PLATFORM}.so

.PHONEY: hellozig
hellozig: ${DIST}/hellozig.${PLATFORM}.so

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
