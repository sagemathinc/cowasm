include ../build/Makefile-vars

# OPT     = -OReleaseFast
# OPT     = -OReleaseSafe
# OPT     = -OReleaseSmall
OPT     = -ODebug

all: ${DIST}/.built ${DIST}/dash.wasm bin

include ../build/Makefile-rules

DASH = ${PACKAGES}/dash/dist/wasm

${DIST}/dash.wasm: ${DASH}/bin/dash
	mkdir -p ${DIST}
	cp $< $@

bin:
	mkdir -p ${DIST}/bin
	cp ${PACKAGES}/coreutils/dist/wasm/bin/* ${DIST}/bin

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
