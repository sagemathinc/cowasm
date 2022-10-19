include ../build/Makefile-vars

all: ${DIST}/.built hello python bin-cowasm cowasm

include ../build/Makefile-rules

node_modules:
	npm ci

${DIST}/.built: node_modules
	npx tsc
	touch ${DIST}/.built

.PHONY: test
test: all
	npm run test
