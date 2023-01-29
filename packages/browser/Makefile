include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: deps node_modules src/index.ts
	pnpm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
