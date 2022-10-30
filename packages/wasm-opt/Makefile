# We could try to build binaryen from source with zig, etc., but that's probably
# a difficult challenge, and could also take several minutes (?), since it's nontrivial
# C++ code.  See https://github.com/sagemathinc/cowasm/issues/39 where the author
# of binaryen suggests just this.

# For now we're just installing the cross-platform WASM binary, so we can incorporate
# wasm-opt in our build tooling in order to get an immediate benefit.

include ../build/Makefile-vars

all: ${DIST}/.built ${BIN}/wasm-opt

include ../build/Makefile-rules

${DIST}/.built:
	npm ci
	mkdir ${DIST}
	touch ${DIST}/.built

${BIN}/wasm-opt: ${DIST}/.built
	ln -s `pwd`/node_modules/.bin/wasm-opt ${BIN}/wasm-opt

