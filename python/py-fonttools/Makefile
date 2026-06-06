include ../build/Makefile-vars

all: deps wasm

VERSION = 4.62.1
WHEEL = fonttools-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/fd/ba/56147c165442cc5ba7e82ecf301c9a68353cede498185869e6e02b4c264f/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 7487782e2113861f4ddcc07c3436450659e3caa5e470b27dc2177cade2d8e7fd

include ../build/Makefile-vars-wheel

TOP_LEVEL = fontTools

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import fontTools; import fontTools.ttLib'
