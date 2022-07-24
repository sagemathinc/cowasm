# They recommend getting vim from git.

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
WASM_POSIX = ${CWD}/../wasm-posix/dist
TERMCAP = ${CWD}/../termcap/dist/wasm

all:  wasm

${BUILD}/wasm:
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && git clone --depth=1 https://github.com/vim/vim.git wasm

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && vim_cv_toupper_broken="no" vim_cv_terminfo="no" RANLIB="zig ranlib" AR="zig ar" CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib" CXXFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib" \
		./configure --host=none --build=`./config.guess` --prefix="${DIST_WASM}" \
			--with-tlib=termcap
			--disable-terminal
	cd ${BUILD}/wasm && make
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
