##
# This does not work at all yet.
##

include ../build/Makefile-vars

# https://github.com/matplotlib/matplotlib/releases
VERSION=3.6.2


URL = https://github.com/matplotlib/matplotlib/archive/refs/tags/v${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/matplotlib-${VERSION}.tar.gz
TARBALL_SHA256 = 5ac5ca25e6ecd1e7711e1f859b4b6f74f290ef517387d1502bf8012bf2b1647e

# Keep this package disabled from the top-level supported set until the
# headless Agg/SVG smoke tests pass, but make direct package builds real.
all: deps wasm

include ../build/Makefile-rules

FREETYPE_WASM = $(shell cowasm-package-path @cowasm/freetype)
QHULL_WASM = $(shell cowasm-package-path @cowasm/qhull)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)
LIBCXX_WASM = $(shell cowasm-package-path @cowasm/libcxx)
PKG_CONFIG_PATH_WASM = ${FREETYPE_WASM}/lib/pkgconfig:${ZLIB_WASM}/lib/pkgconfig

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && python3 ${SRC}/patch-setup.py
	touch ${BUILD_WASM}/.patched

PYTHONPATH = ${PACKAGES}/py-pip/dist/wasm:${PACKAGES}/py-numpy/dist/wasm:${PACKAGES}/py-packaging/dist/wasm:${PACKAGES}/py-pyparsing/dist/wasm:${PACKAGES}/py-cycler/dist/wasm:${PACKAGES}/py-fonttools/dist/wasm:${PACKAGES}/py-dateutil/dist/wasm:${PACKAGES}/py-pytz/dist/wasm:${PACKAGES}/py-six/dist/wasm:${PACKAGES}/py-kiwisolver/dist/wasm

${BUILD_WASM}/.install: deps ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& CFLAGS="-I${FREETYPE_WASM}/include -I${FREETYPE_WASM}/include/freetype2 -I${QHULL_WASM}/include -I${ZLIB_WASM}/include" \
			CPPFLAGS="-I${FREETYPE_WASM}/include -I${FREETYPE_WASM}/include/freetype2 -I${QHULL_WASM}/include -I${ZLIB_WASM}/include" \
			CXXFLAGS="-I${FREETYPE_WASM}/include -I${FREETYPE_WASM}/include/freetype2 -I${QHULL_WASM}/include -I${ZLIB_WASM}/include" \
			LDFLAGS="-L${FREETYPE_WASM}/lib -L${QHULL_WASM}/lib -L${ZLIB_WASM}/lib ${LIBCXX_WASM}/libcxx.so" \
			PKG_CONFIG_PATH="${PKG_CONFIG_PATH_WASM}" \
			SETUPTOOLS_SCM_PRETEND_VERSION=${VERSION} \
			PYTHONPATH=${PYTHONPATH} \
			pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.install

# CPython 3.14's WASM py_compile currently writes an unusable pyc for
# matplotlib/_mathtext.py, so ship that module as source.
${DIST_WASM}/.built: ${BUILD_WASM}/.install
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD_WASM}/build/lib* \
		&& pnpm-exec cpython -m cowasm_bundler matplotlib matplotlib/_mathtext.py mpl_toolkits pylab.py
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib*/matplotlib.tar.xz
	rm -f ${DIST_WASM}/matplotlib/_mathtext.pyc
	cp -R ${BUILD_WASM}/lib/matplotlib/mpl-data ${DIST_WASM}/matplotlib/mpl-data
	cp ${LIBCXX_WASM}/libcxx.so ${DIST_WASM}/matplotlib/libcxx.so
	cp ${LIBCXX_WASM}/libcxx.so ${DIST_WASM}/matplotlib/backends/libcxx.so
	touch ${DIST_WASM}/.built

PYTHONPATH_TEST = ${DIST_WASM}:${PYTHONPATH}

test: deps ${DIST_WASM}/.built
	rm -rf ${BUILD_WASM}/cowasm-test
	mkdir -p ${BUILD_WASM}/cowasm-test
	cd ${BUILD_WASM}/cowasm-test \
		&& MPLCONFIGDIR=. PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${PYTHONPATH_TEST} pnpm-exec cpython -c 'import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt; plt.plot([1, 2, 3], [1, 4, 9]); plt.savefig("plot.png")'
	test -s ${BUILD_WASM}/cowasm-test/plot.png
