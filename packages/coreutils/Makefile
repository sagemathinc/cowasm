# This builds our WASM port of coreutils

include ../build/Makefile-vars

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
	${TARGET}/dirname \
	${TARGET}/du \
	${TARGET}/env \
	${TARGET}/expand \
	${TARGET}/expr \
	${TARGET}/factor \
	${TARGET}/false \
	${TARGET}/find \
	${TARGET}/fmt \
	${TARGET}/fold \
	${TARGET}/grep \
	${TARGET}/head \
	${TARGET}/id \
	${TARGET}/join \
	${TARGET}/ln \
	${TARGET}/logname \
	${TARGET}/ls \
	${TARGET}/mkdir \
	${TARGET}/mktemp \
	${TARGET}/mv \
	${TARGET}/nl \
	${TARGET}/paste \
	${TARGET}/pathchk \
	${TARGET}/pr \
	${TARGET}/readlink \
	${TARGET}/realpath \
	${TARGET}/rm \
	${TARGET}/rmdir \
	${TARGET}/seq \
	${TARGET}/sleep \
	${TARGET}/sort \
	${TARGET}/stat \
	${TARGET}/tail \
	${TARGET}/tee \
	${TARGET}/test \
	${TARGET}/touch \
	${TARGET}/tr \
	${TARGET}/tsort \
	${TARGET}/tty \
	${TARGET}/uname \
	${TARGET}/unexpand \
	${TARGET}/uniq \
	${TARGET}/wc \
	${TARGET}/which \
	${TARGET}/xargs \
	${TARGET}/yes
	@# These don't work at all:
	@# ${TARGET}/split \

include ../build/Makefile-rules

# ensure that node_modules exists before anything else happens.
# This is easier than making node_modules a dep for everything.
-include dummy


.PHONY: dummy
dummy: node_modules deps

CC = ${BIN}/cowasm-cc

# Put -g at the end to get debug symbols and much bigger binaries.
CFLAGS = -Oz -fvisibility-main -I$(shell cowasm-package-path @cowasm/posix-wasm) -I${SRC}/compat -I$(shell cowasm-package-path @cowasm/bzip2)/include -I$(shell cowasm-package-path @cowasm/zlib)/include -DWITHOUT_LIBCRYPTO # -g
LDFLAGS = -L$(shell cowasm-package-path @cowasm/bzip2)/lib -lbz2 -L$(shell cowasm-package-path @cowasm/zlib)/lib -lz

# See https://stackoverflow.com/questions/54192234/recursive-search-in-vpath
# and https://stackoverflow.com/questions/231229/how-to-generate-a-makefile-with-source-in-sub-directories-using-just-one-makefil
space :=
space +=
VPATH := $(subst $(space),:,$(shell find ${SRC} -type d))

${BUILD}/%.o: %.c
	cd ../build && make zig
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

${TARGET}/find: ${COMPAT} ${BUILD}/find-function.o ${BUILD}/find-main.o ${BUILD}/find-operator.o ${BUILD}/find.o ${BUILD}/find-ls.o ${BUILD}/find-misc.o ${BUILD}/find-option.o ${BUILD}/find-getdate.tab.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/grep: ${COMPAT} ${BUILD}/grep-file.o ${BUILD}/grep-queue.o ${BUILD}/grep-util.o ${BUILD}/grep.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/ls: ${COMPAT} ${BUILD}/cmp.o ${BUILD}/ls.o ${BUILD}/print.o ${BUILD}/utf8.o ${BUILD}/util.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/mv: ${COMPAT} ${BUILD}/mv.o ${BUILD}/mv-rm.o ${BUILD}/mv-cp.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/pr: ${COMPAT} ${BUILD}/pr.o ${BUILD}/pr-egetopt.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/sort: ${COMPAT} ${BUILD}/bwstring.o ${BUILD}/coll.o ${BUILD}/file.o \
      ${BUILD}/mem.o  ${BUILD}/sort.o  ${BUILD}/vsort.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tail: ${COMPAT} ${BUILD}/forward.o ${BUILD}/misc.o ${BUILD}/read.o ${BUILD}/reverse.o ${BUILD}/tail.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tr: ${COMPAT} ${BUILD}/tr.o ${BUILD}/tr-str.o
	${CC} ${CFLAGS} $^ -o $@

${TARGET}/tsort: ${COMPAT} ${BUILD}/tsort.o ${BUILD}/ohash.o
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

test-dirname: ${TARGET}/dirname
	test "`${BIN}/cowasm ${TARGET}/dirname foo/bar/stuff`" = "foo/bar"

test-env: ${TARGET}/env
	test "`FOO=bar ${BIN}/cowasm dist/wasm/bin/env |grep FOO`" = "FOO=bar"

test-expr: ${TARGET}/expr
	test "`${BIN}/cowasm ${TARGET}//expr 2 + 3`" = "5"

test-factor: ${TARGET}/factor
	test "`${BIN}/cowasm ${TARGET}/factor 2023`" = "2023: 7 17 17"

test-fmt: ${TARGET}/fmt
	echo "foo bar" | cowasm ./dist/wasm/bin/fmt -w 3 | wc -l | grep 2

test-grep: ${TARGET}/grep
	# This is a TEST-OF-GREP
	# MATCHES
	${BIN}/cowasm ${TARGET}/grep TEST-OF-GREP Makefile | grep "TEST-OF-GREP"
	# Does not match:
	test x"`${BIN}/cowasm ${TARGET}/grep TEST-OF-GREP README.md`" = "x"

test-id: ${TARGET}/id
	${BIN}/cowasm ${TARGET}/id |grep uid
	${BIN}/cowasm ${TARGET}/id |grep gid
	${BIN}/cowasm ${TARGET}/id |grep group

test-ln: ${TARGET}/ln
	${BIN}/cowasm ./dist/wasm/bin/ln -sf README.md ${BUILD}/.xyz && ls -l ${BUILD}/.xyz |grep xyz | grep README.md ; rm ${BUILD}/.xyz

test-ls: ${TARGET}/ls
	${BIN}/cowasm ${TARGET}/ls ${TARGET} | grep ls

test-mktemp: ${TARGET}/mktemp
	# rm would error if file didn't exist...
	rm `${BIN}/cowasm ${TARGET}/mktemp abc.XXXXXX`

test-seq: ${TARGET}/seq ${TARGET}/tr
	${BIN}/cowasm ${TARGET}/seq 1 3 10 | ${BIN}/cowasm dist/wasm/bin/tr '\n' ' ' |grep "1 4 7 10"

test-sleep: ${TARGET}/sleep
	${BIN}/cowasm ${TARGET}/sleep 0.1

test-head: ${TARGET}/head
	echo "first line" > ${BUILD}/.test-head
	echo "last line" >> ${BUILD}/.test-head
	test "`${BIN}/cowasm ${TARGET}/head -n 1 ${BUILD}/.test-head`" = "first line"
	rm ${BUILD}/.test-head

test-join: ${TARGET}/join
	printf "1 X\n2 Y\n3 Z" > ${BUILD}/a
	printf "1 x\n2 y\n3 z" > ${BUILD}/b
	test "`cowasm ${TARGET}/join  ${BUILD}/a ${BUILD}/b`" = "`printf "1 X x\n2 Y y\n3 Z z"`"

test-mkdir-rmdir: ${TARGET}/mkdir ${TARGET}/rmdir ${TARGET}/test
	${BIN}/cowasm ${TARGET}/mkdir xyz-mkdir && ${BIN}/cowasm ${TARGET}/rmdir xyz-mkdir && ${BIN}/cowasm ${TARGET}/test ! -d xyz-mkdir

test-mv: ${TARGET}/mv ${TARGET}/touch ${TARGET}/test ${TARGET}/rm
	${BIN}/cowasm ${TARGET}/touch x && ${BIN}/cowasm ${TARGET}/mv x y && ${BIN}/cowasm ${TARGET}/test -f y && ${BIN}/cowasm ${TARGET}/rm y

test-rm: ${TARGET}/rm ${TARGET}/touch
	${BIN}/cowasm ${TARGET}/touch xyz-rm && ${BIN}/cowasm ${TARGET}/rm xyz-rm && ${BIN}/cowasm ${TARGET}/test ! -f xyz-rm

test-sort: ${TARGET}/sort
	printf "x\na\ny\nhello\n" | ${BIN}/cowasm ${TARGET}/sort | ${BIN}/cowasm ${TARGET}/tr '\n' ' ' | grep "a hello x y"

test-stat: ${TARGET}/stat
	${BIN}/cowasm ${TARGET}/stat ${TARGET}/stat |grep ${TARGET}/stat
	${BIN}/cowasm ${TARGET}/stat -s ${TARGET}/stat |grep st_mtime

test-tail: ${TARGET}/tail
	echo "first line" > ${BUILD}/.test-tail
	echo "last line" >> ${BUILD}/.test-tail
	test "`${BIN}/cowasm ${TARGET}/tail -n 1 ${BUILD}/.test-tail`" = "last line"
	rm ${BUILD}/.test-tail

test-tee: ${TARGET}/tee
	echo "Hello" | ${BIN}/cowasm ${TARGET}/tee ${BUILD}/.greetings.txt | grep Hello;  grep Hello ${BUILD}/.greetings.txt; rm ${BUILD}/.greetings.txt

test-touch: ${TARGET}/touch
	${BIN}/cowasm ${TARGET}/touch ${BUILD}/.foobar; ls ${BUILD}/.foobar |wc -l | grep 1;  rm ${BUILD}/.foobar

test-tr: ${TARGET}/tr
	echo "Bella" | ${BIN}/cowasm ${TARGET}/tr Bl 81 |grep 8e11a

test-tty: ${TARGET}/tty
	# Do not be too precise with output so this works on both mac and linux...
	${BIN}/cowasm ${TARGET}/tty | grep /dev

test-uname: ${TARGET}/uname
	test "`${BIN}/cowasm ${TARGET}/uname`" = "wasi"
	test "`${BIN}/cowasm ${TARGET}/uname -a`" = "wasi (none) 0.0.0 0.0.0 wasm32"

test-uniq: ${TARGET}/uniq
	printf "hello\nworld\nworld\nworld\n" | ${BIN}/cowasm ${TARGET}/uniq | wc -l | grep 2

test-wc: ${TARGET}/wc
	echo "hello world" | ${BIN}/cowasm ${TARGET}/wc | grep "1       2      12"

test-which: ${TARGET}/which
	test "`${BIN}/cowasm ${TARGET}/which which`" = "`which which`"

test-xargs: ${TARGET}/xargs
	ls -1 | ${BIN}/cowasm ${TARGET}/xargs |grep Makefile |grep dist

# Our makefile rule '${BUILD}/%.o: %.c' above assumes that .c files in
# subdirs have **unique names**, and this checks that.
test-uniq-sources:
	cd ${SRC} && ./uniq-sources.sh

# TODO: this doesn't match cocalc so fix.
# format:
# 	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0

# Very basic tests of some things.
# NOTE: "make -j8 test" seems to crash tty on linux host at least.

# TODO/skip -- right now "test-tty" is NOT included below since it causes
# this wasm error on GitHub Actions:
#    /home/runner/work/cowasm/cowasm/packages/coreutils/dist/wasm/bin/tty RuntimeError: memory access out of bounds

test: test-uniq-sources test-basename test-cat test-dirname test-cp test-cut test-date test-env test-expr test-factor test-fmt test-grep test-head test-id \
	test-join test-ls test-mktemp test-mkdir-rmdir test-mv test-rm test-seq test-sleep test-sort test-stat test-tail test-touch test-tr \
	test-uname test-uniq test-wc  test-which test-xargs
	@echo "Success -- all coreutils tests passed"


