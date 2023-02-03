include ../build/Makefile-vars

all: ${DIST}/.built ${BIN}/wasi-js

include ../build/Makefile-rules

${DIST}/.built: node_modules
	pnpm install
	pnpm run build
	touch ${DIST}/.built

# eventually ${BIN}/cowasm should jsut call wasi-js when the executable isn't a DLL
# For now we just directly run this wasi-js script.  This is used by zcc and z++.
${BIN}/wasi-js: ${DIST}/.built
	ln -sf `pwd`/bin/run.js ${BIN}/wasi-js
	touch ${BIN}/wasi-js


# There's a lot of testing of this in cowasm-python right now...

test: ${DIST}/.built
	echo "it built"
