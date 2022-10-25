include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
OPT     = -OReleaseSmall
# OPT     = -ODebug

all: ${DIST}/.built python

include ../build/Makefile-rules

PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
CPYTHON = ${PACKAGES}/cpython/dist/wasm
DYLINK = ${PACKAGES}/dylink/dist

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

${DIST}/python.wasm: src/python.zig ${BUILD}/libpython.o
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

BUNDLES = ${DIST}/python-minimal.zip ${DIST}/python-readline.zip ${DIST}/python-stdlib.zip ${DIST}/python-sandbox.zip


${DIST}/%.zip: ${PYTHON_WASM}/lib/dist/%.zip
	# Copy over the modules file
	mkdir -p ${DIST}
	cp $< $@

PYTHON_PACKAGES = ${DIST}/Cython.tar.xz ${DIST}/mpmath.tar.xz ${DIST}/numpy.tar.xz ${DIST}/sympy.tar.xz

${DIST}/Cython.tar.xz: ${PACKAGES}/py-cython/dist/wasm/Cython.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/mpmath.tar.xz: ${PACKAGES}/py-mpmath/dist/wasm/mpmath.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/numpy.tar.xz: ${PACKAGES}/py-numpy/dist/wasm/numpy.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/sympy.tar.xz: ${PACKAGES}/py-sympy/dist/wasm/sympy.tar.xz
	mkdir -p ${DIST}
	cp $< $@

${DIST}/python-sandbox.zip: ${DIST}/python-stdlib.zip ${PYTHON_PACKAGES}
	cd ${DIST} \
		&&	cp python-stdlib.zip .python-sandbox.zip \
		&&  zip .python-sandbox.zip *.tar.xz python.wasm \
		&&  mv .python-sandbox.zip python-sandbox.zip



.PHONY: python
python: ${DIST}/python.wasm hello hellozig ${BUNDLES} ${PYTHON_PACKAGES}


###
# An example minimal Python extension module, written in C.
###

PLATFORM = cpython-311-wasm32-wasi

${DIST}/hello.${PLATFORM}.so: src/extension/hellomodule.c
	${BIN}/cowasm-cc -Oz ${CFLAGS} -shared  \
		src/extension/hellomodule.c -o ${DIST}/hello.${PLATFORM}.so

${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.${PLATFORM}.so: ${DIST}/hello.${PLATFORM}.so
	cp  ${DIST}/hello.${PLATFORM}.so ${PYTHON_WASM}/lib/python3.11/lib-dynload/

.PHONEY: hello
hello: ${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.${PLATFORM}.so

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
	npm run test
