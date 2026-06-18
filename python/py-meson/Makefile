include ../build/Makefile-vars

all: wasm ${BIN}/meson

# See https://github.com/mesonbuild/meson/releases
VERSION = 1.11.1
WHEEL = meson-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/5e/cd/f3a881ff5e601d6bbeff63b38ee2362e1167c47d9cde03eddf8d71a4ffb0/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = 9b3a023657e393dbc5335b95c561337d49b7a458f5541e47ec44f2cc566e0d80

include ../build/Makefile-vars-wheel

define WHEEL_BUILD
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/mesonbuild ${DIST_WASM}/
	cp -r ${BUILD_WASM}/meson-${VERSION}.dist-info ${DIST_WASM}/
	find ${DIST_WASM} -type d -name __pycache__ -prune -exec rm -rf {} +
endef

${BIN}/meson: bin/meson ${DIST_WASM}/.built
	ln -sf ${CWD}/bin/meson ${BIN}/meson

test: ${DIST_WASM}/.built ${BIN}/meson
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} ${BIN}/python-wasm -c 'import mesonbuild'
	PYTHONPATH=${DIST_WASM} python3 -m mesonbuild.mesonmain --version | grep ${VERSION}
	${BIN}/meson --version | grep ${VERSION}
