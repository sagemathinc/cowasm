include ../build/Makefile-vars

all: deps ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built:  src/index.ts
	npm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test: deps ${DIST}/.built
	echo "it built"