include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
