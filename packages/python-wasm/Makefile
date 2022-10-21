include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
OPT     = -OReleaseSmall
# OPT     = -ODebug

all: ${DIST}/.built ${DIST}/python/python.wasm

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

${DIST}/python/python.wasm: src/python.zig ${BUILD}/libpython.o
	mkdir -p ${DIST}
	cd src/ \
		&& ${BIN}/cowasm-zig \
			${OPT} \
			${CFLAGS} \
			${LDFLAGS} \
			python.zig \
			${BUILD}/libpython.o \
		&& mv python.wasm ${DIST}/python.wasm

###
# An example minimal Python extension module, written in C
###

PLATFORM = cpython-311-wasm32-wasi

${DIST}/hello.${PLATFORM}.so: src/extension/hellomodule.c
	echo ${PATH}
	${BIN}/cowasm-cc -v -Oz -I${PYTHON_WASM}/include/python3.11 -I${POSIX_WASM} -shared  \
		src/extension/hellomodule.c -o ${DIST}/hello.${PLATFORM}.so

${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.${PLATFORM}.so: ${DIST}/hello.${PLATFORM}.so
	cp  ${DIST}/hello.${PLATFORM}.so ${PYTHON_WASM}/lib/python3.11/lib-dynload/

.PHONEY: hello
hello: ${PYTHON_WASM}/lib/python3.11/lib-dynload/hello.${PLATFORM}.so



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
