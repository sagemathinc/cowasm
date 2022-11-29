# This builds the luatex tex compiler

## TODO: doesn't work yet; this isn't a trivial port...

include ../build/Makefile-vars

# See https://github.com/TeX-Live/luatex/releases

VERSION = 1.13.0-svn7420

URL = https://github.com/TeX-Live/luatex/archive/refs/heads/trunk.zip

#URL = https://github.com/TeX-Live/luatex/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/luatex-head.tar.gz

all: wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}


###
# WASM
###


${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}


test:
	echo "no tests yet"