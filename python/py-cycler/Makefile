include ../build/Makefile-vars

all: deps wasm

VERSION = 0.12.1
WHEEL = cycler-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/e7/05/c19819d5e3d95294a6f5947fb9b9629efb316b96de511b418c53d245aae6/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 85cef7cff222d8644161529808465972e51340599459b8ac3ccbac5a854e0d30
PYTHONPATH = $(shell cowasm-package-path @cowasm/py-six)

include ../build/Makefile-vars-wheel

TOP_LEVEL = cycler

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM}:${PYTHONPATH} pnpm-exec cpython -c 'from cycler import cycler; assert list(cycler(color=["r", "g"]))[1]["color"] == "g"'
