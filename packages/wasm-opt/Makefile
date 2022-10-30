# We could try to build binaryen from source with zig, etc., but that's probably
# a difficult challenge, and could also take several minutes (?), since it's nontrivial
# C++ code.  See https://github.com/sagemathinc/cowasm/issues/39 where the author
# of binaryen suggests just this.

# For now we're just installing the cross-platform WASM binary, since it works everywhere.
# NOTE that it can be 10x slower than a native binary, but native binaries aren't available
# for all of our supported platforms.

include ../build/Makefile-vars

all: ${DIST}/.built ${BIN}/wasm-opt ${BIN}/cowasm-opt

include ../build/Makefile-rules

${DIST}/.built:
	npm ci
	mkdir ${DIST}
	touch ${DIST}/.built

${BIN}/wasm-opt: ${DIST}/.built
	ln -s `pwd`/node_modules/.bin/wasm-opt ${BIN}/wasm-opt

${BIN}/cowasm-opt: ${BIN}/wasm-opt ${SRC}/cowasm_opt.py
	ln -sf ${SRC}/cowasm_opt.py ${BIN}/cowasm-opt
	touch ${BIN}/cowasm-opt

test:
	${BIN}/cowasm-opt | grep Usage