include ../build/Makefile-vars

# See http://greenwoodsoftware.com/less/download.html
VERSION = 608
URL = https://ftp.gnu.org/gnu/less/less-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/less-${VERSION}.tar.gz
TARBALL_SHA256 = a69abe2e0a126777e021d3b73aa3222e1b261f10e64624d41ec079685a6ac209
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)

all:  wasm

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir ${BUILD_WASM}/bits/
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	chmod +w ${BUILD_WASM}/*
	# disable these for now since otherwise less uses its own
	# winch function in lsystem.c, which I think conflicts with ncurses and
	# breaks everything horribly.  We use position.h for this, just
	# because it is included in the right spot in lsystem.c
	echo "#undef SIGWINCH" >> ${BUILD_WASM}/position.h
	echo "#undef SIGWIND" >> ${BUILD_WASM}/position.h
	# TODO: This sets the "-d" flag to be on by default, since the calls to ltgetstr
	# in screen.c currently don't work, but less does "work", though without
	# bold/underline/etc.  Remove this patch and fix this.
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-disable-dumb-error.patch | patch -p2
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-fvisibility-main -Oz -Wno-deprecated-non-prototype -I${TERMCAP_WASM}/include -I${NCURSES_WASM}/include  -I${POSIX_WASM}" \
			LDFLAGS="-L${TERMCAP_WASM}/lib -ltermcap -L${NCURSES_WASM}/lib -lncurses" \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&&  echo "#undef HAVE_POPEN" >> defines.h \
		&&  echo "#undef HAVE_TTYNAME" >> defines.h \
		&&  echo "#undef HAVE__SETJMP" >> defines.h \
		&&  echo "#undef HAVE_SIGSETMASK" >> defines.h \
		&& 	make -j8 \
		&& 	make -j8 install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	# Check it starts and prints some help
	echo "" | cowasm ${DIST_WASM}/bin/less --help |grep "Commands"

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	@status=0; \
	$(MAKE) -C ../termcap test-clang-standalone || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	if [ "$$status" -ne 0 ]; then exit "$$status"; fi
	@status=0; \
	$(MAKE) -C ../ncurses test-clang-standalone || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	if [ "$$status" -ne 0 ]; then exit "$$status"; fi
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../termcap/dist/clang ${CWD}/../ncurses/dist/clang ${CWD}/../posix-wasm/dist/wasm ${SRC} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang
