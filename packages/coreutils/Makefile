# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

TARGET = ${DIST_WASM}/bin

all: \
	${TARGET}/basename.wasm \
	${TARGET}/cat.wasm \
	${TARGET}/chmod.wasm \
	${TARGET}/comm.wasm \
	${TARGET}/csplit.wasm \
	${TARGET}/cp.wasm \
	${TARGET}/csplit.wasm \
	${TARGET}/cut.wasm \
	${TARGET}/date.wasm \
	${TARGET}/factor.wasm \
	${TARGET}/head.wasm \
	${TARGET}/ls.wasm \
	${TARGET}/sleep.wasm \
	${TARGET}/tail.wasm \
	${TARGET}/xargs.wasm \
	${TARGET}/yes.wasm

include ../build/Makefile-rules

CC = ${BIN}/cowasm-cc

# comment out -Xlinker -s to get debug symbols
CFLAGS = -fvisibility-main -I${POSIX_WASM} -I${SRC}/compat  -Xlinker -s


# See https://stackoverflow.com/questions/54192234/recursive-search-in-vpath
# and https://stackoverflow.com/questions/231229/how-to-generate-a-makefile-with-source-in-sub-directories-using-just-one-makefil
space :=
space +=
VPATH := $(subst $(space),:,$(shell find ${SRC} -type d))

${BUILD}/%.o: %.c
	mkdir -p ${BUILD} ${TARGET}
	${CC} -c $^ ${CFLAGS} -o $@

COMPAT = ${BUILD}/fmt_scaled.o ${BUILD}/recallocarray.o ${BUILD}/getbsize.o ${BUILD}/strmode.o

# This builds any bin executable foo.wasm that depends only on foo.o and the compat files.

${TARGET}/%.wasm: ${COMPAT} ${BUILD}/%.o
	${CC} ${CFLAGS} $^ -o $@

# Explicit rules for bin executables with more complicated dependencies go here:

${TARGET}/cp.wasm: ${COMPAT} ${BUILD}/cp.o ${BUILD}/utils.o
	${CC} ${CFLAGS} $^ -o $@
test-cp: ${TARGET}/cp.wasm
	rm -f ${BUILD}/x
	cowasm ${TARGET}/cp.wasm Makefile ${BUILD}/x
	ls ${BUILD}/x
	rm ${BUILD}/x

${TARGET}/factor.wasm: ${COMPAT} ${BUILD}/factor.o ${BUILD}/pattern.o ${BUILD}/pr_tbl.o
	${CC} ${CFLAGS} $^ -o $@


${TARGET}/ls.wasm: ${COMPAT} ${BUILD}/cmp.o ${BUILD}/ls.o ${BUILD}/print.o ${BUILD}/utf8.o ${BUILD}/util.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tail.wasm: ${COMPAT} ${BUILD}/forward.o ${BUILD}/misc.o ${BUILD}/read.o ${BUILD}/reverse.o ${BUILD}/tail.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/xargs.wasm: ${COMPAT} ${BUILD}/xargs.o  ${BUILD}/strnsubst.o
	${CC} ${CFLAGS} $^ -o $@



# TESTS -- do something with each bin script
# Be sure to also add these to test: below!

test-basename: ${TARGET}/basename.wasm
	test "`cowasm ${TARGET}/basename.wasm foo/bar`" = "bar"

test-cat: ${TARGET}/cat.wasm
	cowasm ${TARGET}/cat.wasm Makefile |grep crazy-nonsense-but-it-is-here-so-this-works

test-cut: ${TARGET}/cut.wasm
	test "`echo 'hello world' | cowasm ${TARGET}/cut.wasm -c 1-5`" = "hello"
	test "`echo 'hello world' | cowasm ${TARGET}/cut.wasm -c 7-11`" = "world"

test-date:  ${TARGET}/date.wasm
	cowasm ${TARGET}/date.wasm | grep 20[2-9][0-9]

test-factor: ${TARGET}/factor.wasm
	test "`cowasm ${TARGET}/factor.wasm 2023`" = "2023: 7 17 17"

test-ls: ${TARGET}/ls.wasm
	cowasm ${TARGET}/ls.wasm ${TARGET} | grep ls.wasm

test-sleep: ${TARGET}/sleep.wasm
	cowasm ${TARGET}/sleep.wasm 0.1

test-head: ${TARGET}/head.wasm
	echo "first line" > ${BUILD}/.test-head
	echo "last line" >> ${BUILD}/.test-head
	test "`cowasm ${TARGET}/head.wasm -n 1 ${BUILD}/.test-head`" = "first line"
	rm ${BUILD}/.test-head

test-tail: ${TARGET}/tail.wasm
	echo "first line" > ${BUILD}/.test-tail
	echo "last line" >> ${BUILD}/.test-tail
	test "`cowasm ${TARGET}/tail.wasm -n 1 ${BUILD}/.test-tail`" = "last line"
	rm ${BUILD}/.test-tail

test-xargs: ${TARGET}/xargs.wasm
	ls -1 | cowasm ${TARGET}/xargs.wasm |grep Makefile |grep dist


# Very basic tests of some things...
test: test-uniq-sources test-basename test-cat test-cp test-cut test-date test-factor test-head test-ls test-sleep test-tail test-xargs

# Our makefile rule '${BUILD}/%.o: %.c' above assumes that .c files in
# subdirs have **unique names**, and this checks that.
test-uniq-sources:
	cd ${SRC} && ./uniq-sources.sh

# TODO: this doesn't match cocalc so fix.
format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0
