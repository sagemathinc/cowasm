include ../build/Makefile-vars

all: deps ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: node_modules src/index.ts
	pnpm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
