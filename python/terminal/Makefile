include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: node_modules src/index.ts
	npm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test: ${DIST}/.built
	echo "it built"