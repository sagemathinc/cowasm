include ../build/Makefile-vars

# See http://greenwoodsoftware.com/less/download.html
VERSION = 608
URL = http://greenwoodsoftware.com/less/less-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/less-${VERSION}.tar.gz

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)

all:  wasm

include ../build/Makefile-rules

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

test:
	# Check it starts and prints some help
	echo "" | ${BIN}/cowasm ${DIST_WASM}/bin/less --help |grep "Commands"
