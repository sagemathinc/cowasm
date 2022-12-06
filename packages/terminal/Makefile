include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: node_modules src/index.ts
	npm install
	npm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test: node_modules ${DIST}/.built
	npx tsc
	echo "it built!"