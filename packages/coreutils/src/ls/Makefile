CC = zig cc
CFLAGS = -target wasm32-wasi -Oz -D_XOPEN_SOURCE=700 -I../compat -I..

all:
	${CC} ${CFLAGS} cmp.c ls.c main.c print.c util.c utf8.c -o ls
