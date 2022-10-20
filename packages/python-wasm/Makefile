include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

node_modules:
	npm ci

${DIST}/.built: node_modules
	npx tsc
	touch ${DIST}/.built

.PHONY: test
test: all
	echo "no tests yet"
	#npm run test
