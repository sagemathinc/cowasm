# This package exists to install pip using the ensurepip module.
# We can't run this as part of the cpython build, since python-wasm isn't built yet.

include ../build/Makefile-vars

all: wasm

include ../build/Makefile-rules

${DIST_WASM}/.built:
	mkdir -p ${DIST_WASM}
	python-wasm-debug -m ensurepip
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	python-wasm-debug -m pip |grep Usage