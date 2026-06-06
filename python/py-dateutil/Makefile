include ../build/Makefile-vars

all: deps wasm

VERSION = 2.9.0.post0
WHEEL = python_dateutil-${VERSION}-py2.py3-none-any.whl
URL = https://files.pythonhosted.org/packages/ec/57/56b9bcc3c9c6a792fcbaf139543cee77261f3651ca9da0c93f5c1221264b/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = a8b2bc7bffae282281c8140a97d3aa9c14da0b136dfe83f850eea9a5f7470427
PYTHONPATH = $(shell cowasm-package-path @cowasm/py-six)

include ../build/Makefile-vars-wheel

TOP_LEVEL = dateutil

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM}:${PYTHONPATH} pnpm-exec cpython -c 'from dateutil.parser import parse; assert parse("2026-06-05").year == 2026'
