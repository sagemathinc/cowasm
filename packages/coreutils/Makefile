# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

BASENAME = ${DIST_WASM}/bin/basename.wasm

all: ${BUILD_WASM}/.source \
	${BASENAME} \
	${DIST_WASM}/bin/cat.wasm \
	${DIST_WASM}/bin/chmod.wasm \
	${DIST_WASM}/bin/comm.wasm \
	${DIST_WASM}/bin/csplit.wasm \
	${DIST_WASM}/bin/cp.wasm \
	${DIST_WASM}/bin/csplit.wasm \
	${DIST_WASM}/bin/cut.wasm \
	${DIST_WASM}/bin/date.wasm \
	${DIST_WASM}/bin/factor.wasm \
	${DIST_WASM}/bin/ls.wasm \
	${DIST_WASM}/bin/sleep.wasm

include ../build/Makefile-rules

CC = wacalc-cc

# comment out -Xlinker -s to get debug symbols
CFLAGS = -fvisibility-main -fPIC -I${POSIX_WASM} -I${SRC}/compat -I${SRC}/fts -Xlinker -s

${BUILD_WASM}/.source:: src/**
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	mkdir -p ${DIST_WASM}/bin
	touch ${BUILD_WASM}/.source

%.o: %.c
	${CC} -c $^ ${CFLAGS} -o $@

COMPAT = ${BUILD_WASM}/compat/fmt_scaled.o ${BUILD_WASM}/compat/progname.o ${BUILD_WASM}/compat/strtonum.o ${BUILD_WASM}/compat/getbsize.o ${BUILD_WASM}/compat/strmode.o

UTILS = ${BUILD_WASM}/utils

${BASENAME}: ${COMPAT} ${UTILS}/basename/basename.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/%.wasm: ${COMPAT} $(wildcard ${UTILS}/*/%.o)l
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/chmod.wasm: ${COMPAT} ${UTILS}/chmod/chmod.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/comm.wasm: ${COMPAT} ${UTILS}/comm/comm.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/cp.wasm: ${COMPAT} ${UTILS}/cp/cp.o ${UTILS}/cp/utils.o ${BUILD_WASM}/fts/fts.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/csplit.wasm: ${COMPAT} ${UTILS}/csplit/csplit.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/cut.wasm: ${COMPAT} ${UTILS}/cut/cut.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/date.wasm: ${COMPAT} ${UTILS}/date/date.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/factor.wasm: ${COMPAT} ${UTILS}/factor/factor.o ${UTILS}/factor/pattern.o ${UTILS}/factor/pr_tbl.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/ls.wasm: ${COMPAT} ${BUILD_WASM}/fts/fts.o ${UTILS}/ls/cmp.o ${UTILS}/ls/ls.o ${UTILS}/ls/main.o  ${UTILS}/ls/print.o ${UTILS}/ls/utf8.o ${UTILS}/ls/util.o
	${CC} ${CFLAGS} $^ -o $@

${DIST_WASM}/bin/sleep.wasm: ${COMPAT} ${UTILS}/sleep/sleep.o
	${CC} ${CFLAGS} $^ -o $@

# TODO: this doesn't match cocalc so fix.
format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0
