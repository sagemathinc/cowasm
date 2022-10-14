# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

BIN = ${DIST_WASM}/bin

all: \
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


# See https://stackoverflow.com/questions/54192234/recursive-search-in-vpath
# and https://stackoverflow.com/questions/231229/how-to-generate-a-makefile-with-source-in-sub-directories-using-just-one-makefil
space :=
space +=
VPATH := $(subst $(space),:,$(shell find ${SRC} -type d))

${BUILD}/%.o: %.c
	mkdir -p ${BUILD} ${BIN}
	${CC} -c $^ ${CFLAGS} -o $@

COMPAT = ${BUILD}/fmt_scaled.o ${BUILD}/progname.o ${BUILD}/strtonum.o ${BUILD}/getbsize.o ${BUILD}/strmode.o

# This builds any bin executable foo.wasm that depends only on foo.o and the compat files.

${BIN}/%.wasm: ${COMPAT} ${BUILD}/%.o
	${CC} ${CFLAGS} $^ -o $@

# Explicit rules for bin executables with more complicated dependencies go here:

${BIN}/cp.wasm: ${COMPAT} ${BUILD}/cp.o ${BUILD}/utils.o ${BUILD}/fts.o
	${CC} ${CFLAGS} $^ -o $@
test-cp: ${BIN}/cp.wasm
	rm -f ${BUILD}/x
	wacalc ${BIN}/cp.wasm Makefile ${BUILD}/x
	ls ${BUILD}/x
	rm ${BUILD}/x

${BIN}/ls.wasm: ${COMPAT} ${BUILD}/fts.o ${BUILD}/cmp.o ${BUILD}/ls.o ${BUILD}/print.o ${BUILD}/utf8.o ${BUILD}/util.o
	${CC} ${CFLAGS} $^ -o $@

${BIN}/factor.wasm: ${COMPAT} ${BUILD}/factor.o ${BUILD}/pattern.o ${BUILD}/pr_tbl.o
	${CC} ${CFLAGS} $^ -o $@

${BIN}/xargs.wasm: ${COMPAT} ${BUILD}/xargs.o  ${BUILD}/strnsubst.o
	${CC} ${CFLAGS} $^ -o $@



# TESTS -- do something with each bin script
# Be sure to also add these to test: below!

test-basename: ${BIN}/basename.wasm
	wacalc ${BIN}/basename.wasm foo/bar |grep -v foo | grep bar

test-cat: ${BIN}/cat.wasm
	wacalc ${BIN}/cat.wasm Makefile |grep crazy-nonsense-but-it-is-here-so-this-works

test-cut: ${BIN}/cut.wasm
	echo "hello world" | wacalc ${BIN}/cut.wasm -c 1-5 | grep -v world | grep hello

test-date:  ${BIN}/date.wasm
	wacalc ${BIN}/date.wasm | grep 20[2-9][0-9]

test-factor: ${BIN}/factor.wasm
	wacalc ${BIN}/factor.wasm 2023 |grep 2023 |grep "7 17 17"

test-ls: ${BIN}/ls.wasm
	wacalc ${BIN}/ls.wasm ${BIN} |grep ls.wasm

test-sleep: ${BIN}/sleep.wasm
	wacalc ${BIN}/sleep.wasm 0.1

test-xargs: ${BIN}/xargs.wasm
	ls -1 | wacalc ${BIN}/xargs.wasm |grep Makefile |grep dist


# Very basic tests of some things...
test: test-uniq-sources test-basename test-cat test-cp test-cut test-date test-factor test-ls test-sleep test-xargs

# Our makefile rule '${BUILD}/%.o: %.c' above assumes that .c files in
# subdirs have **unique names**, and this checks that.
test-uniq-sources:
	cd ${SRC} && ./uniq-sources.sh

# TODO: this doesn't match cocalc so fix.
format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0
