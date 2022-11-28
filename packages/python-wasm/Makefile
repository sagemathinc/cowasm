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

CFLAGS = -I${CPYTHON}/include/python3.11 -I${POSIX_WASM}
LDFLAGS = -L${CPYTHON}/lib -lpython3.11

###
# Python as a web assembly library with a few extras compiled in
# needed be usable.
###

${BUILD}/libpython.o: ${DYLINK}/wasm-export/libpython.c
	mkdir -p ${BUILD}
	${BIN}/cowasm-cc -Oz ${CFLAGS} \
		-c ${DYLINK}/wasm-export/libpython.c \
		-o ${BUILD}/libpython.o

${DIST}/python.wasm: src/python.zig src/signal.zig ${BUILD}/libpython.o ${CPYTHON}/lib/libpython3.11.a
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


${DIST}/%.zip: ${CPYTHON}/lib/dist/%.zip
	# Copy over the modules file
	mkdir -p ${DIST}
	cp $< $@

PYTHON_PACKAGES = ${DIST}/Cython.tar.xz ${DIST}/mpmath.tar.xz ${DIST}/numpy.tar.xz ${DIST}/sympy.tar.xz ${DIST}/pandas.tar.xz ${DIST}/pytz.tar.xz ${DIST}/dateutil.tar.xz ${DIST}/six.tar.xz

${DIST}/Cython.tar.xz: $(shell cowasm-package-path @cowasm/cython)/Cython.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/mpmath.tar.xz: $(shell cowasm-package-path @cowasm/mpmath)/mpmath.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/numpy.tar.xz: $(shell cowasm-package-path @cowasm/numpy)/numpy.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/pandas.tar.xz: $(shell cowasm-package-path @cowasm/pandas)/pandas.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/pytz.tar.xz: $(shell cowasm-package-path @cowasm/pandas)/pytz.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/dateutil.tar.xz: $(shell cowasm-package-path @cowasm/pandas)/dateutil.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/six.tar.xz: $(shell cowasm-package-path @cowasm/pandas)/six.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/sympy.tar.xz: $(shell cowasm-package-path @cowasm/sympy)/sympy.tar.xz
	mkdir -p ${DIST}
	cp $< $@

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
	${BIN}/cowasm-cc -Oz ${CFLAGS} -shared  \
		src/extension/hellomodule.c -o ${DIST}/hello.${PLATFORM}.so

.PHONEY: hello
hello: ${DIST}/hello.${PLATFORM}.so

###
# An example minimal Python extension module, written in Zig.
###

${DIST}/hellozig.${PLATFORM}.so: src/extension/hellozigmodule.zig src/extension/hellozigmodule.c
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
