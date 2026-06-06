include ../build/Makefile-vars

all: deps wasm

VERSION = 3.3.2
WHEEL = pyparsing-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/p/pyparsing/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 850ba148bd908d7e2411587e247a1e4f0327839c40e2e5e6d05a007ecc69911d

include ../build/Makefile-vars-wheel

TOP_LEVEL = pyparsing

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import pyparsing; assert pyparsing.Word(pyparsing.alphas).parse_string("cowasm")[0] == "cowasm"'
