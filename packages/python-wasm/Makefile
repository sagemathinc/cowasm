include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
OPT     = -OReleaseSmall
# OPT     = -ODebug

all: ${DIST}/.built ${DIST}/python/python.wasm

include ../build/Makefile-rules

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
CPYTHON = ${PACKAGES}/cpython/dist/wasm
DYLINK = ${PACKAGES}/dylink/dist

CFLAGS = -I${CPYTHON}/include/python3.11 -I${POSIX_WASM}
LDFLAGS = -L${CPYTHON}/lib -lpython3.11

${BUILD}/libpython.o: ${DYLINK}/wasm-export/libpython.c
	mkdir -p ${BUILD}
	${BIN}/cowasm-cc -v -Oz ${CFLAGS} \
		-c ${DYLINK}/wasm-export/libpython.c \
		-o ${BUILD}/libpython.o

${DIST}/python/python.wasm: src/python.zig ${BUILD}/libpython.o
	mkdir -p ${DIST}
	cd src/ \
		&& ${BIN}/cowasm-zig -v \
			${OPT} \
			${CFLAGS} \
			${LDFLAGS} \
			python.zig \
			${BUILD}/libpython.o \
		&& mv python.wasm ${DIST}/python.wasm

node_modules:
	npm ci

${DIST}/.built: node_modules
	mkdir -p ${DIST}
	npx tsc
	touch ${DIST}/.built

.PHONY: test
test: all
	echo "no tests yet"
	#npm run test
