include ../build/Makefile-vars

# See https://ftp.gnu.org/pub/gnu/ncurses/?C=M;O=D
VERSION = 6.3
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
URL = https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/ncurses-${VERSION}.tar.gz
TARBALL_SHA256 = 97fc51ac2b085d4cde31ef4d2c3122c21abc217e9090a43a30fc5ec21684e059

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)

all:  wasm ${BUILD_WASM}/test/.built

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	$(MAKE) -C ../termcap test-clang-standalone || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	if [ "$$status" -ne 0 ]; then exit "$$status"; fi
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../termcap/dist/clang ${CWD}/../posix-wasm/dist/wasm || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
	@status=0; \
	$(MAKE) -C ../termcap test-wasi-sdk-standalone || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	if [ "$$status" -ne 0 ]; then exit "$$status"; fi
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CWD}/../termcap/dist/wasi-sdk ${CWD}/../posix-wasm/dist/wasm

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

# NATIVE -- we do not use this, since pretty much any reasonable native build host has curses already.
# Also, we barely use the native python build...

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc ${ZIG_NATIVE_CFLAGS} " \
			CXX="zig c++ ${ZIG_NATIVE_CFLAGS} " \
			AR="zig ar ${ZIG_NATIVE_CFLAGS} " \
			CFLAGS="-Oz -I${POSIX_WASM}" \
			CXXFLAGS="-Oz -I${POSIX_WASM}" \
			./configure \
				--prefix=${DIST_NATIVE} \
				--without-ada \
				--without-manpages \
				--without-progs \
				--without-tests \
				--without-ticlib \
				--enable-termcap \
				--disable-stripping \
		&& make -j8 \
		&& make -j8 install.libs
	touch ${DIST_NATIVE}/.built

# WASM.

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# Patch terminfo.src, since there are two obscure entries (of the thousands) that prevent "make install" from working.
	cd ${BUILD_WASM}/misc && patch -p0 < ${SRC}/00-terminfo.patch
	# Obviously, these should be done as patches:
	cd ${BUILD_WASM}/ncurses/tty && echo '#include "posix-wasm.h"' | cat - lib_tstp.c > tmp && mv tmp lib_tstp.c
	cd ${BUILD_WASM}/progs && echo '#include "posix-wasm.h"' | cat - tset.c > tmp && mv tmp tset.c
	cd ${BUILD_WASM}/test && echo '#include "posix-wasm.h"' | cat - picsmap.c > tmp && mv tmp picsmap.c
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-disable-ncurses-test.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-Oz -fvisibility-main -I${TERMCAP_WASM}/include -L${TERMCAP_WASM}/lib -I${POSIX_WASM}" \
			CXXFLAGS="-Oz -I${TERMCAP_WASM}/include -L${TERMCAP_WASM}/lib -I${POSIX_WASM}" \
			./configure \
				--without-ada \
				--without-manpages \
				--without-tests \
				--enable-termcap \
				--disable-stripping \
				--build=`./config.guess` \
				--host=none \
				--prefix="${DIST_WASM}" \
				--with-build-cc="zig cc" \
		&& 	make -j8 \
		&& 	make -j8 install.libs
	# this makes it much easier to use for client libraries:
	cd ${DIST_WASM}/include && ln -sf ncurses/curses.h .
	# Clear command is pretty useful
	cp ${BUILD_WASM}/progs/clear ${DIST_WASM}/bin/clear
	touch ${DIST_WASM}/.built

${BUILD_WASM}/test/.built: node_modules ${DIST_WASM}/.built
	cd ../build && make zig
	cd ${BUILD_WASM}/test \
		&& RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main  -I${TERMCAP_WASM}/include  -I${POSIX_WASM} -I${DIST_WASM}/include" \
			LDFLAGS="-L${TERMCAP_WASM}/lib  -L${DIST_WASM}/lib -lncurses" \
			./configure \
				--without-ada \
				--without-manpages \
				--without-progs \
				--without-pthread \
				--disable-stripping \
				--build=`../config.guess` \
				--host=none \
				--prefix="${DIST_WASM}" \
				--with-build-cc="zig cc" \
		&& echo "#undef USE_PTHREADS" >> ncurses_cfg.h \
		&& 	make -j8 install
	touch ${BUILD_WASM}/test/.built

${DIST_WASM}/bin/hello: ${DIST_WASM}/.built  ${SRC}/hello.c
	mkdir -p ${DIST_WASM}/bin
	${BIN}/cowasm-cc -Werror=main -v -fvisibility-main -Oz -I${DIST_WASM}/include/ncurses -I${DIST_WASM}/include -L${DIST_WASM}/lib -lncurses ${SRC}/hello.c -o ${DIST_WASM}/bin/hello


test: ${BUILD_WASM}/test/.built
	echo "all the (supported) ncurses test programs built successfully"
