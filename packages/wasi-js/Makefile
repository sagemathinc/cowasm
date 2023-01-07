include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: node_modules
	pnpm install
	pnpm run build
	touch ${DIST}/.built

# There's a lot of testing of this in cowasm-python right now...

test: ${DIST}/.built
	echo "it built"
