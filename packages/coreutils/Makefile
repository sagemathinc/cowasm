# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

BIN = ${DIST_WASM}/bin

all: ${BUILD_WASM}/.source \
	${BIN}/basename.wasm \
	${BIN}/cat.wasm \
	${BIN}/chmod.wasm \
	${BIN}/comm.wasm \
	${BIN}/csplit.wasm \
	${BIN}/cp.wasm \
	${BIN}/csplit.wasm \
	${BIN}/cut.wasm \
	${BIN}/date.wasm \
	${BIN}/factor.wasm \
	${BIN}/ls.wasm \
	${BIN}/sleep.wasm \
	${BIN}/xargs.wasm \
	${BIN}/yes.wasm

include ../build/Makefile-rules

CC = wacalc-cc

# comment out -Xlinker -s to get debug symbols
CFLAGS = -fvisibility-main -I${POSIX_WASM} -I${SRC}/compat -I${SRC}/fts -Xlinker -s

${BUILD_WASM}/.source:: src/**
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	mkdir -p ${BIN}
	touch ${BUILD_WASM}/.source

%.o: %.c
	${CC} -c $^ ${CFLAGS} -o $@

COMPAT = ${BUILD_WASM}/compat/fmt_scaled.o ${BUILD_WASM}/compat/progname.o ${BUILD_WASM}/compat/strtonum.o ${BUILD_WASM}/compat/getbsize.o ${BUILD_WASM}/compat/strmode.o

UTILS = ${BUILD_WASM}/utils

${BIN}/basename.wasm: ${COMPAT} ${UTILS}/basename/basename.o
	${CC} ${CFLAGS} $^ -o $@
test-basename:
	wacalc ${BIN}/basename.wasm foo/bar |grep -v foo | grep bar

${BIN}/cat.wasm: ${COMPAT} ${UTILS}/cat/cat.o
	${CC} ${CFLAGS} $^ -o $@
test-cat:
	wacalc ${BIN}/cat.wasm Makefile |grep crazy-nonsense-but-it-is-here-so-this-works

${BIN}/chmod.wasm: ${COMPAT} ${UTILS}/chmod/chmod.o
	${CC} ${CFLAGS} $^ -o $@

${BIN}/comm.wasm: ${COMPAT} ${UTILS}/comm/comm.o
	${CC} ${CFLAGS} $^ -o $@

${BIN}/cp.wasm: ${COMPAT} ${UTILS}/cp/cp.o ${UTILS}/cp/utils.o ${BUILD_WASM}/fts/fts.o
	${CC} ${CFLAGS} $^ -o $@
test-cp:
	wacalc ${BIN}/cp.wasm Makefile ${BUILD_WASM}/x && ls ${BUILD_WASM}/x && rm ${BUILD_WASM}/x

${BIN}/csplit.wasm: ${COMPAT} ${UTILS}/csplit/csplit.o
	${CC} ${CFLAGS} $^ -o $@

${BIN}/cut.wasm: ${COMPAT} ${UTILS}/cut/cut.o
	${CC} ${CFLAGS} $^ -o $@
test-cut:
	echo "hello world" | wacalc ${BIN}/cut.wasm -c 1-5 | grep -v world | grep hello

${BIN}/date.wasm: ${COMPAT} ${UTILS}/date/date.o
	${CC} ${CFLAGS} $^ -o $@
test-date:
	wacalc ${BIN}/date.wasm | grep 20[2-9][0-9]

${BIN}/factor.wasm: ${COMPAT} ${UTILS}/factor/factor.o ${UTILS}/factor/pattern.o ${UTILS}/factor/pr_tbl.o
	${CC} ${CFLAGS} $^ -o $@
test-factor:
	wacalc ${BIN}/factor.wasm 2023 |grep 2023 |grep "7 17 17"

${BIN}/ls.wasm: ${COMPAT} ${BUILD_WASM}/fts/fts.o ${UTILS}/ls/cmp.o ${UTILS}/ls/ls.o ${UTILS}/ls/main.o  ${UTILS}/ls/print.o ${UTILS}/ls/utf8.o ${UTILS}/ls/util.o
	${CC} ${CFLAGS} $^ -o $@
test-ls:
	wacalc ${BIN}/ls.wasm ${BIN} |grep ls.wasm

${BIN}/sleep.wasm: ${COMPAT} ${UTILS}/sleep/sleep.o
	${CC} ${CFLAGS} $^ -o $@
test-sleep:
	wacalc ${BIN}/sleep.wasm 0.1

${BIN}/xargs.wasm: ${COMPAT} ${UTILS}/xargs/xargs.o  ${UTILS}/xargs/strnsubst.o
	${CC} ${CFLAGS} $^ -o $@
test-xargs:
	ls -1 | wacalc ${BIN}/xargs.wasm |grep Makefile |grep dist


${BIN}/yes.wasm: ${COMPAT} ${UTILS}/yes/yes.o
	${CC} ${CFLAGS} $^ -o $@

# Very basic tests of everything
test: test-basename test-cat test-cp test-cut test-date test-factor test-ls test-sleep test-xargs

# TODO: this doesn't match cocalc so fix.
format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0
