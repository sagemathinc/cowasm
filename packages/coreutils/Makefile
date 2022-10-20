# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

TARGET = ${DIST_WASM}/bin

all: \
	${TARGET}/basename \
	${TARGET}/cat \
	${TARGET}/chmod \
	${TARGET}/comm \
	${TARGET}/csplit \
	${TARGET}/cp \
	${TARGET}/csplit \
	${TARGET}/cut \
	${TARGET}/date \
	${TARGET}/factor \
	${TARGET}/head \
	${TARGET}/ln \
	${TARGET}/ls \
	${TARGET}/sleep \
	${TARGET}/tail \
	${TARGET}/tee \
	${TARGET}/touch \
	${TARGET}/tr \
	${TARGET}/tty \
	${TARGET}/uniq \
	${TARGET}/wc \
	${TARGET}/xargs \
	${TARGET}/yes

include ../build/Makefile-rules

CC = ${BIN}/cowasm-cc

# Put -g at the end to get debug symbols and much bigger binaries.
CFLAGS = -fvisibility-main -I${POSIX_WASM} -I${SRC}/compat # -g

# See https://stackoverflow.com/questions/54192234/recursive-search-in-vpath
# and https://stackoverflow.com/questions/231229/how-to-generate-a-makefile-with-source-in-sub-directories-using-just-one-makefil
space :=
space +=
VPATH := $(subst $(space),:,$(shell find ${SRC} -type d))

${BUILD}/%.o: %.c
	mkdir -p ${BUILD} ${TARGET}
	${CC} -c $^ ${CFLAGS} -o $@

COMPAT = ${BUILD}/fmt_scaled.o ${BUILD}/recallocarray.o ${BUILD}/getbsize.o ${BUILD}/strmode.o

# This builds any bin executable foo that depends only on foo.o and the compat files.

${TARGET}/%: ${COMPAT} ${BUILD}/%.o
	${CC} ${CFLAGS} $^ -o $@

# Explicit rules for bin executables with more complicated dependencies go here:

${TARGET}/cp: ${COMPAT} ${BUILD}/cp.o ${BUILD}/utils.o
	${CC} ${CFLAGS} $^ -o $@
test-cp: ${TARGET}/cp
	rm -f ${BUILD}/x
	${BIN}/cowasm ${TARGET}/cp Makefile ${BUILD}/x
	ls ${BUILD}/x
	rm ${BUILD}/x

${TARGET}/factor: ${COMPAT} ${BUILD}/factor.o ${BUILD}/pattern.o ${BUILD}/pr_tbl.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/ls: ${COMPAT} ${BUILD}/cmp.o ${BUILD}/ls.o ${BUILD}/print.o ${BUILD}/utf8.o ${BUILD}/util.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tail: ${COMPAT} ${BUILD}/forward.o ${BUILD}/misc.o ${BUILD}/read.o ${BUILD}/reverse.o ${BUILD}/tail.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tr: ${COMPAT} ${BUILD}/tr.o ${BUILD}/tr-str.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/xargs: ${COMPAT} ${BUILD}/xargs.o  ${BUILD}/strnsubst.o
	${CC} ${CFLAGS} $^ -o $@



# TESTS -- do something with each bin script
# Be sure to also add these to test: below!

test-basename: ${TARGET}/basename
	test "`cowasm ${TARGET}/basename foo/bar`" = "bar"

test-cat: ${TARGET}/cat
	${BIN}/cowasm ${TARGET}/cat Makefile |grep crazy-nonsense-but-it-is-here-so-this-works

test-cut: ${TARGET}/cut
	test "`echo 'hello world' | ${BIN}/cowasm ${TARGET}/cut -c 1-5`" = "hello"
	test "`echo 'hello world' | ${BIN}/cowasm ${TARGET}/cut -c 7-11`" = "world"

test-date:  ${TARGET}/date
	${BIN}/cowasm ${TARGET}/date | grep 20[2-9][0-9]

test-factor: ${TARGET}/factor
	test "`${BIN}/cowasm ${TARGET}/factor 2023`" = "2023: 7 17 17"

test-ln: ${TARGET}/ln
	${BIN}/cowasm ./dist/wasm/bin/ln -sf README.md ${BUILD}/.xyz && ls -l ${BUILD}/.xyz |grep xyz | grep README.md ; rm ${BUILD}/.xyz

test-ls: ${TARGET}/ls
	${BIN}/cowasm ${TARGET}/ls ${TARGET} | grep ls

test-sleep: ${TARGET}/sleep
	${BIN}/cowasm ${TARGET}/sleep 0.1

test-head: ${TARGET}/head
	echo "first line" > ${BUILD}/.test-head
	echo "last line" >> ${BUILD}/.test-head
	test "`${BIN}/cowasm ${TARGET}/head -n 1 ${BUILD}/.test-head`" = "first line"
	rm ${BUILD}/.test-head

test-tail: ${TARGET}/tail
	echo "first line" > ${BUILD}/.test-tail
	echo "last line" >> ${BUILD}/.test-tail
	test "`${BIN}/cowasm ${TARGET}/tail -n 1 ${BUILD}/.test-tail`" = "last line"
	rm ${BUILD}/.test-tail

test-tee: ${TARGET}/tee
	echo "Hello" | ${BIN}/cowasm ./dist/wasm/bin/tee ${BUILD}/.greetings.txt | grep Hello;  grep Hello ${BUILD}/.greetings.txt; rm ${BUILD}/.greetings.txt

test-touch: ${TARGET}/touch
	cowasm dist/wasm/bin/touch ${BUILD}/.foobar; ls ${BUILD}/.foobar |wc -l | grep 1;  rm ${BUILD}/.foobar

test-tr: ${TARGET}/tr
	echo "Bella" | ${BIN}/cowasm dist/wasm/bin/tr Bl 81 |grep 8e11a

test-tty: ${TARGET}/tty
	${BIN}/cowasm ./dist/wasm/bin/tty | grep /dev/tty

test-uniq: ${TARGET}/uniq
	printf "hello\nworld\nworld\nworld\n" | ${BIN}/cowasm dist/wasm/bin/uniq | wc -l | grep 2

test-wc: ${TARGET}/wc
	echo "hello world" | ${BIN}/cowasm dist/wasm/bin/wc | grep "1       2      12"

test-xargs: ${TARGET}/xargs
	ls -1 | ${BIN}/cowasm ${TARGET}/xargs |grep Makefile |grep dist

# Very basic tests of some things...
test: test-uniq-sources test-basename test-cat test-cp test-cut test-date test-factor test-head test-ls test-sleep test-tail test-touch test-tr test-tty test-uniq test-wc test-xargs

# Our makefile rule '${BUILD}/%.o: %.c' above assumes that .c files in
# subdirs have **unique names**, and this checks that.
test-uniq-sources:
	cd ${SRC} && ./uniq-sources.sh

# TODO: this doesn't match cocalc so fix.
format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0
