include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

# This is only for use by person maintaining the website.
.PHONY: publish
publish:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/python-wasm.org/


clean-build::
	rm -rf node_modules
