include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: node_modules src/index.ts
	pnpm install
	pnpm run build
	touch ${DIST}/.built

clean-build::
	rm -rf node_modules

test: node_modules ${DIST}/.built
	pnpm exec tsc
	echo "it built!"