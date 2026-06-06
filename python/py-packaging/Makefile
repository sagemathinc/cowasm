include ../build/Makefile-vars

all: deps wasm

VERSION = 26.1
WHEEL = packaging-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/7a/c2/920ef838e2f0028c8262f16101ec09ebd5969864e5a64c4c05fad0617c56/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 5d9c0669c6285e491e0ced2eee587eaf67b670d94a19e94e3984a481aba6802f

include ../build/Makefile-vars-wheel

TOP_LEVEL = packaging

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import packaging; from packaging.version import Version; assert Version("3.6.2").major == 3'
