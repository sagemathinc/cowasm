# This builds the vis editor.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/viz/releases

VERSION = 0.8.4

URL = https://github.com/sagemathinc/viz/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/viz-${VERSION}.tar.gz
TARBALL_SHA256 = 41d39d563e0ba3cfb39bca1d671fd776b942d7009c0848bd51ace05ebf9a0b8a

LUA = ${PACKAGES}/lua/dist/

all: deps native ${BIN}/viz-native wasm ${BIN}/viz-wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ../lua && make native
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" \
			CFLAGS="-O2 -I${LUA}/native/include " \
			LDFLAGS="-L${LUA}/native/lib -llua " \
			./configure --prefix=${DIST_NATIVE} \
		&&	make -j8 install
	touch ${DIST_NATIVE}/.built

${BIN}/viz-native: ${DIST_NATIVE}/.built ${CWD}/bin/viz-native
	ln -sf ${CWD}/bin/viz-native ${BIN}/viz-native
	touch ${BIN}/viz-native


###
# WASM
###


${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir -p ${BUILD_WASM}/bits/
	# Adding header at the beginning:
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.c
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/setjmp.h
	echo '#define TIOCGWINSZ 0x5413' >> ${BUILD_WASM}/setjmp.h
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/bits/setjmp.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.h > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/text-io.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/text-io.c
	perl -0pi -e 's/\n\tlibtermkey\/driver-ti\.c \\\n/\n/' ${BUILD_WASM}/Makefile
	perl -0pi -e 's/(static struct TermKeyDriver \*drivers\[\] = \{\n)  &termkey_driver_ti,\n/$${1}#if CONFIG_CURSES\n  \&termkey_driver_ti,\n#endif\n/' ${BUILD_WASM}/libtermkey/termkey.c
	perl -0pi -e 's/(for \(int y = 0; y < h; y\+\+\) \{\n)/$${1}\t\tbuffer_appendf(buf, "\\x1b[%d;1H", y + 1);\n/' ${BUILD_WASM}/ui-terminal-vt100.c
	perl -0pi -e 's/\n\toutput\(buffer_content\(buf\), buffer_length0\(buf\)\);/\n\tUiTermWin *win = tui->selwin;\n\tif (win) {\n\t\tView *view = win->win->view;\n\t\tSelection *sel = view_selections_primary_get(view);\n\t\tconst Line *cursor_line = view_cursors_line_get(sel);\n\t\tint cursor_row = 0;\n\t\tfor (const Line *line = view_lines_first(view); line && line != cursor_line; line = line->next)\n\t\t\tcursor_row++;\n\t\tint cursor_col = view_cursors_cell_get(sel);\n\t\tint cursor_x = win->x + win->sidebar_width + cursor_col + 1;\n\t\tint cursor_y = win->y + cursor_row + 1;\n\t\tcursor_x = MAX(1, MIN(cursor_x, tui->width));\n\t\tcursor_y = MAX(1, MIN(cursor_y, tui->height));\n\t\tbuffer_append0(buf, "\\x1b[0m");\n\t\tbuffer_appendf(buf, "\\x1b[%d;%dH", cursor_y, cursor_x);\n\t}\n\toutput(buffer_content(buf), buffer_length0(buf));/' ${BUILD_WASM}/ui-terminal-vt100.c
	touch ${BUILD_WASM}/.patched


NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)
LUA_WASM = $(shell cowasm-package-path @cowasm/lua)
POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ../build && make zig
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc" \
			CFLAGS="-v -Oz -fvisibility-main -I. -I${POSIX_WASM} -I${NCURSES_WASM}/include -I${NCURSES_WASM}/include/ncurses -I${LUA_WASM}/include" \
			LDFLAGS="-L${LUA_WASM}/lib -llua -L${NCURSES_WASM}/lib -lncurses " \
			./configure --prefix=${DIST_WASM} \
		&&	make -j8 viz \
			CONFIG_CURSES=0 \
			CONFIG_LUA=0 \
			CONFIG_LPEG=0 \
			CFLAGS_CURSES= \
			LDFLAGS_CURSES= \
			CFLAGS_LIBC=-DHAVE_MEMRCHR=1 \
			CFLAGS_LUA= \
			LDFLAGS_LUA= \
			CFLAGS_LPEG= \
			LDFLAGS_LPEG=
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/viz ${DIST_WASM}/bin/
	touch ${DIST_WASM}/.built

${BIN}/viz-wasm: ${DIST_WASM}/.built ${CWD}/bin/viz-wasm
	ln -sf ${CWD}/bin/viz-wasm ${BIN}/viz-wasm
	touch ${BIN}/viz-wasm

test: all
	echo "it built!"
