include ../build/Makefile-vars

all: deps wasm

VERSION = 1.17.0
WHEEL = six-${VERSION}-py2.py3-none-any.whl
URL = https://files.pythonhosted.org/packages/b7/ce/149a00dd41f10bc29e5921b496af8b574d8413afcd5e30dfa0ed46c2cc5e/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274
TOP_LEVEL = six
PRE_BUNDLE = mkdir -p six && cp six.py six/__init__.py

include ../build/Makefile-vars-wheel

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import six; assert six.PY3'
