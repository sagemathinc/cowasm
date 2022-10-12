# This builds our WASM port of coreutils

include ../build/Makefile-vars

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
FTS = ${PACKAGES}/fts/dist/wasm/

all: wasm

include ../build/Makefile-rules

# zig-fPIC cc -c a.c -o a.o && zig wasm-ld --experimental-pic -shared a.o -o a.wasm
#CC = zig cc -target wasm32-wasi
CFLAGS = -I${POSIX_WASM} -I${SRC}/compat -I${SRC}/fts \
	-D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_MMAN
LDFLAGS = --experimental-pic -s --compress-relocations -shared

${BUILD_WASM}/.source:: src/**
	rm -rf ${BUILD_WASM}
	mkdir -p ${BUILD_WASM}
	cp -r src/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.source


${SRC}/fts/%.o: ${SRC}/fts/%.c
	zig-fPIC cc -c $^ ${CFLAGS} -o $@

${SRC}/compat/%.o: ${SRC}/compat/%.c
	zig-fPIC cc -c $^ ${CFLAGS} -o $@

# ${DIST_WASM}/bin/%: ${SRC}/utils/%/*.o | ${BUILD_WASM}/.source
# 	mkdir -p ${DIST_WASM}/bin
# 	zig wasm-ld --experimental-pic -shared  $^ -o $@

COMMON = ${SRC}/fts/fts.o ${SRC}/compat/getbsize.o ${SRC}/compat/strmode.o ${SRC}/compat/strtonum.o  ${SRC}/compat/progname.o ${SRC}/compat/fmt_scaled.o

${SRC}/utils/ls/%.o: ${SRC}/utils/ls/%.c
	zig-fPIC cc -c $^ ${CFLAGS} -o $@

${DIST_WASM}/bin/ls: ${COMMON} ${SRC}/utils/ls/cmp.o ${SRC}/utils/ls/ls.o ${SRC}/utils/ls/main.o  ${SRC}/utils/ls/print.o ${SRC}/utils/ls/utf8.o ${SRC}/utils/ls/util.o | ${BUILD_WASM}/.source
	mkdir -p ${DIST_WASM}/bin
	zig wasm-ld ${LDFLAGS} ${SRC}/utils/ls/*.o ${COMMON} -o ${DIST_WASM}/bin/ls

${SRC}/utils/factor/%.o: ${SRC}/utils/factor/%.c
	zig-fPIC cc -c $^ ${CFLAGS} -o $@

${DIST_WASM}/bin/factor: ${COMMON} ${SRC}/utils/factor/factor.o ${SRC}/utils/factor/pr_tbl.o ${SRC}/utils/factor/pattern.o  | ${BUILD_WASM}/.source
	mkdir -p ${DIST_WASM}/bin
	zig wasm-ld ${LDFLAGS} ${SRC}/utils/factor/*.o ${COMMON} -o ${DIST_WASM}/bin/factor

${SRC}/utils/date/%.o: ${SRC}/utils/date/%.c
	zig-fPIC cc -c $^ ${CFLAGS} -o $@

${DIST_WASM}/bin/date: ${COMMON} ${SRC}/utils/date/date.o  | ${BUILD_WASM}/.source
	mkdir -p ${DIST_WASM}/bin
	zig wasm-ld ${LDFLAGS} ${SRC}/utils/date/*.o ${COMMON}  -o ${DIST_WASM}/bin/date

${DIST_WASM}/bin/chown: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chown

${DIST_WASM}/bin/chgrp: ${DIST_WASM}/bin/chmod
	cd ${DIST_WASM}/bin && ln -sf chmod chgrp

#UTILS = ${DIST_WASM}/bin/basename ${DIST_WASM}/bin/cat ${DIST_WASM}/bin/chgrp ${DIST_WASM}/bin/chmod ${DIST_WASM}/bin/chown ${DIST_WASM}/bin/comm ${DIST_WASM}/bin/cp  ${DIST_WASM}/bin/csplit ${DIST_WASM}/bin/cut ${DIST_WASM}/bin/date ${DIST_WASM}/bin/factor ${DIST_WASM}/bin/ls ${DIST_WASM}/bin/sleep

UTILS = ${DIST_WASM}/bin/date ${DIST_WASM}/bin/factor ${DIST_WASM}/bin/ls

${DIST_WASM}/.built: ${UTILS}
	touch ${BUILD_WASM}/.source

format:
	find src/ -iname *.h -o -iname *.c | xargs clang-format -i --sort-includes=0

strip:
	find  ${DIST_WASM}/bin -type f | xargs -n1 wasm-strip
.PHONY: strip

clean::
	rm -rf ${BUILD_WASM}
	find . -type f -name '*.o' -delete