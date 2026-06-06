include ../build/Makefile-vars

all: deps wasm

VERSION = 2026.1.post1
WHEEL = pytz-${VERSION}-py2.py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py2.py3/p/pytz/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = f2fd16142fda348286a75e1a524be810bb05d444e5a081f37f7affc635035f7a

include ../build/Makefile-vars-wheel

TOP_LEVEL = pytz

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import pytz; assert pytz.timezone("UTC").zone == "UTC"'
