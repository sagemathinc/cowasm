# This builds the dash shell.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/dash/releases which is a mirror of
# https://git.kernel.org/pub/scm/utils/dash/dash.git without the autotools dependency.
VERSION = 0.6.0

URL = https://github.com/sagemathinc/dash/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/dash-${VERSION}.tar.gz
TARBALL_SHA256 = 145447c4514524384bdd7a0ad0c16d7d1b72b51e3022a70b848ff6986317565c

LIBEDIT_WASM = $(shell cowasm-package-path @cowasm/libedit)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
LIBEDIT_WASI_SDK = ${CWD}/../libedit/dist/wasi-sdk
TERMCAP_WASI_SDK = ${CWD}/../termcap/dist/wasi-sdk

all: deps wasm ${BIN}/dash-wasm-raw

include ../build/Makefile-rules


${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/extra.h ${BUILD_WASM}/src/setjmp.h
	mkdir -p ${BUILD_WASM}/src/bits
	cp ${SRC}/extra.h ${BUILD_WASM}/src/bits/setjmp.h
	ln -s ${SRC}/rebuild.sh ${BUILD_WASM}/rebuild.sh
	ln -s ${SRC}/update.sh ${BUILD_WASM}/update.sh  # for developing upstream
	echo "ac_cv_func_sigsetmask=no" > ${BUILD_WASM}/config.site
	cd ${BUILD_WASM} \
		&&	cat ${SRC}/patches/01-jobs-extra-include.patch | patch -p1 \
		&&	cat ${SRC}/patches/02-nodes-extra-include.patch | patch -p1 \
		&&	cat ${SRC}/patches/03-emacs-default.patch | patch -p1 \
		&&	cat ${SRC}/patches/04-vforkexec.patch | patch -p1 \
		&&	cat ${SRC}/patches/05-savefd-without-fcntl.patch | patch -p1 \
		&&	cat ${SRC}/patches/06-growjobtab-initial-null.patch | patch -p1 \
		&&	cat ${SRC}/patches/07-pipeline-without-fork.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# NOTES:
#   - -DJOBS=0 is to completely disable job control, which isn't supported for WASM yet.
#      Right now the first place this fails is in savefd(int from, int ofd), where it uses
#      a fcntl argument that is simply not implemented in WASI yet.  We will probably have
#      to rewrite savefd to use a non-wasi fcntl that we implement.
#   - TODO: I'll probably move libedit and libtermcap to the core (OR their own shared library!)
#     so they don't have to be included here, which will make dash much smaller.  But for now this is fine.
#     They add about 120KB.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${BUILD_WASM}/config.site \
			CC="cowasm-cc" \
			CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" \
			CFLAGS="-O0 -fvisibility-main -DJOBS=0  -I${LIBEDIT_WASM}/include -I${POSIX_WASM}" \
			LDFLAGS="-L${LIBEDIT_WASM}/lib -ledit -L${TERMCAP_WASM}/lib -ltermcap" \
			./configure \
				--with-libedit \
				--prefix=${DIST_WASM} \
				--host=none \
		&&	make -j8 install
	ln -sf ${DIST_WASM}/bin/dash ${DIST_WASM}/bin/sh
	touch ${DIST_WASM}/.built

${BIN}/dash-wasm-raw: ${DIST_WASM}/.built ${CWD}/bin/dash-wasm
	ln -sf ${CWD}/bin/dash-wasm ${BIN}/dash-wasm-raw

test: node_modules ${DIST_WASM}/.built
	# test doing a little arithmetic
	echo "echo \$$((389*5077))" | cowasm ${DIST_WASM}/bin/dash | grep 1974953
	# test that a syntax error doesn't terminate the shell (i.e., no longjmp exception handling)
	echo "); echo 'I am still alive'" | cowasm ${DIST_WASM}/bin/dash | grep alive

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	mkdir -p ${BUILD_WASI_SDK}/src/bits
	printf 'typedef int __jmp_buf;\n' > ${BUILD_WASI_SDK}/src/bits/setjmp.h
	printf '#ifndef COWASM_DASH_WASI_SDK_SETJMP_H\n#define COWASM_DASH_WASI_SDK_SETJMP_H\n#include <stdlib.h>\ntypedef int jmp_buf[1];\n#define setjmp(env) (0)\nstatic inline void longjmp(jmp_buf env, int status) __attribute__((noreturn));\nstatic inline void longjmp(jmp_buf env, int status) { (void)env; (void)status; abort(); }\n#endif\n' > ${BUILD_WASI_SDK}/src/setjmp.h
	ln -sf ${SRC}/rebuild.sh ${BUILD_WASI_SDK}/rebuild.sh
	ln -sf ${SRC}/update.sh ${BUILD_WASI_SDK}/update.sh
	echo "ac_cv_func_sigsetmask=no" > ${BUILD_WASI_SDK}/config.site
	cd ${BUILD_WASI_SDK} \
		&&	cat ${SRC}/patches/03-emacs-default.patch | patch -p1 \
		&&	cat ${SRC}/patches/04-vforkexec.patch | patch -p1 \
		&&	cat ${SRC}/patches/05-savefd-without-fcntl.patch | patch -p1 \
		&&	cat ${SRC}/patches/06-growjobtab-initial-null.patch | patch -p1 \
		&&	cat ${SRC}/patches/07-pipeline-without-fork.patch | patch -p1
	touch ${BUILD_WASI_SDK}/.patched

${LIBEDIT_WASI_SDK}/lib/libedit.a:
	$(MAKE) -C ../libedit test-wasi-sdk-standalone

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.patched ${LIBEDIT_WASI_SDK}/lib/libedit.a
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${LIBEDIT_WASI_SDK} ${TERMCAP_WASI_SDK}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
