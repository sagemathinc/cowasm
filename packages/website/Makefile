CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: ${DIST}/.built

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules tsconfig.tsbuildinfo

# This is only for use by person maintaining the website.
.PHONY: publish
publish:
	npm ci
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/python-wasm.org/
