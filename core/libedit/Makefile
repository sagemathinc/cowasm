
include ../build/Makefile-vars

all: deps wasm

VERSION = 20210910-3.1
TARBALL = ${UPSTREAM}/libedit-${VERSION}.tar.gz
URL = https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz
TARBALL_SHA256 = 6792a6a992050762edcca28ff3318cdb7de37dccf7bc30db59fcd7017eed13c5
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

include ../build/Makefile-rules

# See https://www.thrysoee.dk/editline/

TERMCAP_NATIVE = ${PACKAGES}/termcap/dist/native

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_CLANG}/.patched: ${BUILD_CLANG}/.build
	cp -rv src/* ${BUILD_CLANG}/src/
	cd ${BUILD_CLANG}/src/ && patch -p0 < readline.patch
	touch ${BUILD_CLANG}/.patched

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.patched
	$(MAKE) -C ../termcap test-clang-standalone
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../termcap/dist/clang || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../termcap && make native
	cd ${BUILD_NATIVE} && \
		CFLAGS="-I${TERMCAP_NATIVE}/include -L${TERMCAP_NATIVE}/lib" \
		CC="zig cc -Oz  ${ZIG_NATIVE_CFLAGS_GNU} " \
		AR="zig ar" \
		./configure --prefix=${DIST_NATIVE}
	cd  ${BUILD_NATIVE} && make -j8
	cd  ${BUILD_NATIVE} && make install
	touch ${DIST_NATIVE}/.built


##################
# WASM
##################

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp -rv src/* ${BUILD_WASM}/src/
	cd ${BUILD_WASM}/src/ && patch -p0 < readline.patch
	touch ${BUILD_WASM}/.patched

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/

# We also modify examples/Makefile so we don't have to mess with getting them to build.

CFLAGS_WASM = -Oz -I$(shell cowasm-package-path @cowasm/termcap)/include -D__STDC_ISO_10646__=201103L -D__wasilibc_unmodified_upstream_signal
LDFLAGS_WASM = -L$(shell cowasm-package-path @cowasm/termcap)/lib -ltermcap

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${SRC}/config.site \
			CFLAGS="${CFLAGS_WASM}"  \
			LDFLAGS="${LDFLAGS_WASM}" \
			RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc -Oz" \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&&	echo '#include "extra_config.h"' >> config.h \
		&&	echo "all:" > examples/Makefile \
		&&	echo "install:" >> examples/Makefile \
		&&	make -j8 \
		&&	make install
	# readline compat headers that I copied from FreeBSD!
	cp -rv ${SRC}/readline ${DIST_WASM}/include
	touch ${DIST_WASM}/.built

# Build test program
${BUILD_WASM}/examples/tc1: node_modules ${DIST_WASM}/.built
	cd ../build && make zig
	${BIN}/cowasm-cc -v -fvisibility-main -L${DIST_WASM}/lib -ledit \
		${LDFLAGS_WASM} ${CFLAGS_WASM} \
		-I${BUILD_WASM}/ -I${BUILD_WASM}/src \
		${BUILD_WASM}/examples/tc1.c -o ${BUILD_WASM}/examples/tc1

run-tc1: ${BUILD_WASM}/examples/tc1
	${BIN}/cowasm ${BUILD_WASM}/examples/tc1

test: ${BUILD_WASM}/examples/tc1
	# This is a pretty dumb test, since not interactive, but at least it shows
	# that the program builds and runs at all...
	echo 'ls' | cowasm ${BUILD_WASM}/examples/tc1 |grep "Makefile"
