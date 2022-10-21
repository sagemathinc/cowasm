include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
# OPT     = -OReleaseSmall
OPT     = -ODebug

all: ${DIST}/.built ${DIST}/python/python.wasm

include ../build/Makefile-rules

${DIST}/python/python.wasm: src/python.zig
	mkdir -p ${DIST}
	cd src/ \
		&& ${BIN}/cowasm-zig ${OPT} python.zig \
		&& mv python.wasm ${DIST}/python.wasm

node_modules:
	npm ci

${DIST}/.built: node_modules
	mkdir ${DIST}
	npx tsc
	touch ${DIST}/.built

.PHONY: test
test: all
	echo "no tests yet"
	#npm run test
