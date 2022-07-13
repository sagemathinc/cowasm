CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: ${DIST}/.built

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo
