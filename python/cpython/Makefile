include ../build/Makefile-vars

#
# We build a native version of CPython and a WASM version.
# The native version is ONLY used as part of the cross compilation build process
# and not used for anything else.  TODO: Currently, we can't build native Python using
# only zig on our supported architectures, so we use the native toolchain, which is
# really annoying and makes bootstraping a build a little harder.
#
# See https://www.python.org/downloads/
PYTHON_MAJOR = 3
PYTHON_MINOR = 11
PYTHON_PATCH = 0
PYTHON_BETA =
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

URL = https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}${PYTHON_BETA}.tar.xz
TARBALL = ${UPSTREAM}/python-${PYTHON_VERSION}${PYTHON_BETA}.tar.xz

ZLIB_NATIVE = ${PACKAGES}/zlib-native/dist/native
LIBEDIT_NATIVE = ${PACKAGES}/libedit-native/dist/native

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
LIBEDIT_WASM = $(shell cowasm-package-path @cowasm/libedit)
LZMA_WASM = $(shell cowasm-package-path @cowasm/lzma)
NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
OPENSSL_WASM = $(shell cowasm-package-path @cowasm/openssl)
SQLITE_WASM = $(shell cowasm-package-path @cowasm/sqlite)
BZIP2_WASM = $(shell cowasm-package-path @cowasm/bzip2)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)
LIBFFI_WASM = $(shell cowasm-package-path @cowasm/libffi)

PYTHON_WASM = ${BIN}/python-wasm

# Either -Oz or -O3 make sense to me...
#   -O0 = exceeds a limit so can't even load the result with webassembly!
# The cPython default opt is "-DNDEBUG -g -fwrapv -O3 -Wall", which is
# coded in the generated Makefile.  I have noticed some major compiler bugs
# with -O3, so we can revisit this later with newer LLVM/zig releases.
# For example:
#   https://github.com/sagemathinc/cowasm/issues/27
# is a bug with -O3 that goes away with -Oz. The diff in performance
# is less than 5% with -O3 over -Oz.
# NDEBUG I think disable assertions (?).

# Use this instead for better debugging (?).

WASM_OPT=-DNDEBUG -fwrapv -Wall -Oz -g
#WASM_OPT=-DNDEBUG -fwrapv -Wall -Oz

# Default target
all: native ${BIN}/python-native wasm ${BIN}/python-wasm

${DIST}/.built: native wasm
	touch ${DIST}/.built

include ../build/Makefile-rules

## NATIVE

${BUILD_NATIVE}/.build:: ${TARBALL}
	cp src/Setup.local-native ${BUILD_NATIVE}/Modules/Setup.local
	# This _scproxy is needed macos *only* for pip; on Linux it breaks the build.
	if [ `uname -s` == "Darwin" ]; then echo "_scproxy _scproxy.c" >> ${BUILD_NATIVE}/Modules/Setup.local; fi

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ../lzma-native && make
	cd ../zlib-native && make
	cd ../termcap-native && make
	cd ../libedit-native && make
	cd ${BUILD_NATIVE} \
		&& 	AR="zig ar" \
			CXX="zig c++ ${ZIG_NATIVE_CFLAGS}" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
			CFLAGS="-I${ZLIB_NATIVE}/include -I${LIBEDIT_NATIVE}/include" \
			LDFLAGS="-L${ZLIB_NATIVE}/lib -L${LIBEDIT_NATIVE}" \
			./configure \
				--prefix=${DIST_NATIVE} \
				--with-ensurepip \
				--disable-shared \
				--with-readline=editline
	# On **some** macOS systems having either HAVE_MKFIFOAT or HAVE_MKNODAT breaks
	# the build due to I guess bugs with zig and __builtin_available.   We don't need
	# these anywhere, since native cpython is just for bootstrapping our WASM build anyways.
	# NOTE: I didn't hit this with 3.11.0.rc2, but did with the actual release.
	echo "#undef HAVE_MKFIFOAT" >> ${BUILD_NATIVE}/pyconfig.h
	echo "#undef HAVE_MKNODAT" >> ${BUILD_NATIVE}/pyconfig.h
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses
	# zlib).  This is to workaround a security feature of MacOS (see
	# https://developer.apple.com/forums/thread/9233). For simplicity we set this on all hosts.
	cd ${BUILD_NATIVE} \
		&&	make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" \
		&&	make RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" install
	cp ${SRC}/cowasm_bundler.py ${DIST_NATIVE}/lib/python3.11/site-packages
	touch ${DIST_NATIVE}/.built

${BIN}/python-native: bin/python-native ${DIST_NATIVE}/.built
	rm -f ${BIN}/python-native
	ln -s ${CWD}/bin/python-native ${BIN}/python-native
	touch ${BIN}/python-native

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built ${BIN}/python-native
	${BIN}/python-native


## WASM

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ../build && make node
	# Create declarations that make everything extension modules need
	# accessible from outside our "python.wasm as a shared library".
	npx dylink-libpython ${BUILD_WASM} > ${BUILD_WASM}/Programs/libpython.c
	# Scripts to make it easy to change CPython and rebuild iteratively
	ln -sf ${SRC}/rebuild ${BUILD_WASM}/rebuild
	# Copy the config.site, which answers questions needed for
	# cross compiling, without which ./configure won't work.
	cp src/config.site ${BUILD_WASM}
	# Configure how modules are built
	cp src/Setup.local ${BUILD_WASM}/Modules/Setup.local
	# Custom code to run at startup
	cp src/sitecustomize.py ${BUILD_WASM}/Lib
	# Copy over our small cowasm-specific library with functionality for our packages.
	cp ${SRC}/cowasm_bundler.py ${BUILD_WASM}/Lib
	cp ${SRC}/cowasm_importer.py ${BUILD_WASM}/Lib
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to posix-wasm.h
	mkdir ${BUILD_WASM}/sys
	echo '#include "posix-wasm.h"' >  ${BUILD_WASM}/sys/wait.h
	# Apply our patches:
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-main.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-pydoc.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/03-wasm-assets.patch | patch -p1
	# Apply this patch when we want to take testing to the next level, and fully enable all
	# tests that involve subprocess support.  Our goal is to support subprocesses fully, but
	# it is NOT to support fork, which is just not possible in general with WebAssembly.
	# However, I believe subprocess support is possible in a fully solid robust way.
	cd ${BUILD_WASM} && cat ${SRC}/patches/04-enable-subprocess-tests.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/05-st_mode.patch | patch -p1
	# Implement 'import platform; platform.architecture()' for wasm.
	cd ${BUILD_WASM} && cat ${SRC}/patches/06-platform.patch | patch -p1
	# Fork and execv on top of posix-node work, but it takes some restrictions to be robust:
	cd ${BUILD_WASM} && cat ${SRC}/patches/07-subprocess.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/08-unicode-file-test.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/09-set-inheritable.patch | patch -p1
	# Patch 10-setuptools-c++.patch is used, but only *AFTER* ensurepip happens!
	# This patch 11 is needed for clang15, which detects a bug in a declaration added for wasm support.
	cd ${BUILD_WASM} && cat ${SRC}/patches/11-descrobject-clang15.patch | patch -p1
	# clang15 is more strict:
	cd ${BUILD_WASM} && cat ${SRC}/patches/12-timemodule-clang15.patch | patch -p1
	# We can't use the modified WASI socket.h headers, since they annoyingly render the
	# data structure useless (why!? - to save a few bytes?).
	# See packages/python-wasm/src/wasm/posix/socket.zig  (which will move soon)
	cd ${BUILD_WASM} && cat ${SRC}/patches/13-socket-unmodified-headers.patch | patch -p1
	# Warn instead of error on attempt to start a thread.
	# cd ${BUILD_WASM} && cat ${SRC}/patches/14-threading-warning.patch | patch -p1
	touch ${BUILD_WASM}/.patched

DEBUG_MODE = ""
# DEBUG_MODE = "-g"
BLDSHARED = cowasm-cc --experimental-pic -shared ${DEBUG_MODE}

${DIST_WASM}/.built-cpython: node_modules ${BUILD_WASM}/.patched ${DIST_NATIVE}/.built ${BIN}/python-native
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - with-pymalloc it actually works and seems faster
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	# - We use -I (path to source) in the CC/CXX line in addition to CFLAGS so that we can override some
	#   bad global libraries, e.g., systemwide (zig musl) sys/wait.h with a local version.
	# - In Python source they lower the default recursion limit; however, we don't need that since our
	#   runtime is Chromium, not wasitime and we can handle huge limits (see Include/internal/pycore_ceval.h).
	# - enable-ipv6, since I put a lot of work into this for posix-node!
	# --with-pkg-config=no, this is CRITICAL; otherwise, if pkg-config is installed, then python's build system
	#   will use it and pick up system-wide libraries that are not supported by WASM, which is a huge pain
	#   that leads to subtle bugs.  One example of this is "uuid". (TODO: bug report: should be disabled when cross compiling?)
	# - DPy_DEFAULT_RECURSION_LIMIT=700:
	#       - with -Oz, a limit of 1000 causes test_userdict to fail when testing on
	#         nodejs linux (it works on mac).  test_userlist is even worse.
	#       - with -oZ, test_richcmp.py fails with a limit above 750; a limit of max of 720 works on node on linux.
	#         Changing to -O3 makes no difference.
	# - with-ensurepip: we put that since we need it, but the makefile just runs ensurepip on python-native,
	#   so it doesn't help.  That's fine for our application, since we explicitly run ensurepip later.
	# - explicitly specifying BLDSHARED is needed since otherwise linking shared modules doesn't work.
	#   ALSO, note that wasm-strip for fPIC code must be done at link time and can't be done later, due to
	#   it simply not being implemented yet.  Stripping is automatic with cowasm-cc unless you pass -g.
	cd ${BUILD_WASM} && \
		OPT="${WASM_OPT}" \
		CC="cowasm-cc" \
		CXX="cowasm-c++" \
		AR="zig ar" \
		CFLAGS="${DEBUG_MODE} -I${BUILD_WASM} -I${POSIX_WASM} -DPy_DEFAULT_RECURSION_LIMIT=700" \
		BLDSHARED="${BLDSHARED}" \
		CONFIG_SITE=./config.site \
		READELF=true \
		HOSTRUNNER="${BIN}/cowasm" \
		./configure \
			--config-cache \
			--prefix=${DIST_WASM}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-ipv6 \
			--disable-shared \
			--with-pkg-config=no \
			--with-readline=editline \
			--with-build-python=${BIN}/python-native \
			--with-pymalloc \
			--with-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	cat src/pyconfig.h >> ${BUILD_WASM}/pyconfig.h
	# NOTE: I have seen "error: unable to build WASI libc CRT file: FileNotFound" when using "make -j8",
	# and had it go away when removing parallel build.
	cd ${BUILD_WASM} && \
		LZMA_WASM="${LZMA_WASM}" LIBEDIT_WASM="${LIBEDIT_WASM}" NCURSES_WASM="${NCURSES_WASM}" TERMCAP_WASM="${TERMCAP_WASM}" OPENSSL_WASM="${OPENSSL_WASM}" SQLITE_WASM="${SQLITE_WASM}" BZIP2_WASM="${BZIP2_WASM}" LIBFFI_WASM="${LIBFFI_WASM}" ZLIB_WASM="${ZLIB_WASM}" make -j8
	mkdir -p ${DIST_WASM} && touch ${DIST_WASM}/.built-cpython

${DIST_WASM}/.install-cpython: node_modules ${DIST_WASM}/.built-cpython
	# CRITICAL!  We have to make changes to build/lib.wasi-wasm32-3.11/_sysconfigdata__wasi_wasm32-wasi.py so it
	# matches the configuration we just used.  TODO: Find a better way to fix this, e.g., by configuration or
	# patching something earlier?   This definitely feels like a hack.
	# This is what based on testing actually works:
	#      'LDSHARED': '' --> 'LDSHARED': '${BLDSHARED}'
	# This is idempotent.
	cd ${BUILD_WASM}/build/lib.wasi-wasm32-3.11/ \
		&& sed -i'.bak' "s/'LDSHARED': ''/'LDSHARED': '${BLDSHARED}'/g" _sysconfigdata__wasi_wasm32-wasi.py

	# Install as usual.  Output is huge so we do not show it all.
	cd ${BUILD_WASM} && \
		LZMA_WASM="${LZMA_WASM}" LIBEDIT_WASM="${LIBEDIT_WASM}" NCURSES_WASM="${NCURSES_WASM}" TERMCAP_WASM="${TERMCAP_WASM}" OPENSSL_WASM="${OPENSSL_WASM}"  SQLITE_WASM="${SQLITE_WASM}" BZIP2_WASM="${BZIP2_WASM}" LIBFFI_WASM="${LIBFFI_WASM}" ZLIB_WASM="${ZLIB_WASM}" make install | tail -n 10

	# For some reason (upstream bug?) test-tomllib isn't copied over, but it's nice to have for testing.
	cp -rv ${BUILD_WASM}/Lib/test/test_tomllib ${DIST_WASM}/lib/python3.11/test/
	# Used for extension modules to efficiently access what Python exports.
	cp ${BUILD_WASM}/Programs/libpython.c ${DIST_WASM}/lib
	# Done!
	touch ${DIST_WASM}/.install-cpython

.PHONY:
wasm-cpython: ${DIST_WASM}/.install-cpython

# These are the minimal data files needed to start cPython, which we found via "DEBUG=wasi:open pw-d"!
MINIMAL_FILES = encodings/__init__.pyc encodings/aliases.pyc encodings/utf_8.pyc
MINIMAL_READLINE = termcap lib-dynload/readline.cpython-311-wasm32-wasi.so  rlcompleter.pyc inspect.pyc ast.pyc contextlib.pyc collections/__init__.pyc keyword.pyc operator.pyc reprlib.pyc functools.pyc types.pyc enum.pyc dis.pyc opcode.pyc collections/abc.pyc importlib/__init__.pyc warnings.pyc linecache.pyc tokenize.pyc re/__init__.pyc re/_compiler.pyc re/_parser.pyc re/_constants.pyc re/_casefix.pyc copyreg.pyc token.pyc

# Below we create two zip files:
#
#  ${DIST_WASM}/lib/dist/python-minimal.zip - (size=10K) -- a tiny file with the minimum needed to start python
#  ${DIST_WASM}/lib/dist/python-stdlib.zip - (size= ~ 5MB) -- the full standard libary
#
# We WANT to run wasm_assets.py under web assembly rather than use the native cpython!
# This is just because we can and because it's a *good test*.  It does not work yet.
# To try this, replace
#    && python-native ./Tools/wasm/wasm_assets.py
# below by
#    && python-wasm ./Tools/wasm/wasm_assets.py

${DIST_WASM}/.built: node_modules ${DIST_WASM}/.install-cpython ${BIN}/python-native
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD_WASM} \
		&& mkdir -p usr/local/lib/python3.11/lib-dynload/  \
		&& ${BIN}/python-native ./Tools/wasm/wasm_assets.py \
		&& rm -rf ${DIST_WASM}/lib/dist \
		&& mv usr/local/lib ${DIST_WASM}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp ${SRC}/termcap ${DIST_WASM}/lib/dist/termcap && cd ${DIST_WASM}/lib/dist/ && zip -u python311.zip termcap
	# **TODO:** It is very silly for these to be in the same zip file, obviously, because that means they have to be downloaded,
	# so we should just put them in the main binary.  We'll change that when things are working.
	mkdir -p ${DIST_WASM}/lib/dist/lib-dynload/
	cp -v ${DIST_WASM}/lib/python3.11/lib-dynload/*.so ${DIST_WASM}/lib/dist/lib-dynload/

	# This would run wasm-opt on the so extension modules, but it is not
	# necessarily "worth it", since it only reduces the size by less than 3%.
	#${BIN}/cowasm-opt ${DIST_WASM}/lib/dist/lib-dynload/

	# Unfortunately, wasm-strip removes the critical custom section that makes the so file useful, since NotImplementedError
	#      https://reviews.llvm.org/D73820
	#find ${DIST_WASM}/lib/dist/lib-dynload -type f -name "*.so" | xargs -n1 ${CWD}/node_modules/.bin/wasm-strip
	# Instead, we use the -s option to wasm-ld above.
	# Also mv zip to a more meaningful name.
	cd ${DIST_WASM}/lib/dist/ \
		&& zip -u python311.zip lib-dynload/* \
		&& mv python311.zip python-stdlib.zip

	# Next make the MINIMAL python0.zip, which is all that's needed to start python (e.g., for a
	# jupyter kernel or to back
	# computations, but not a REPL). We also make a version with the readline so, so you
	# can start a terminal, before more data needs to be loaded.
	cd ${DIST_WASM}/lib/dist/ \
		&& mkdir tmp && cd tmp && unzip ../python-stdlib.zip && cp ../termcap .\
		&& zip ../python-minimal.zip ${MINIMAL_FILES} \
		&& zip ../python-readline.zip ${MINIMAL_FILES} ${MINIMAL_READLINE} \
		&& cd .. && rm -rf tmp

	# Add some code at the end of the _sysconfigdata so that it is sufficiently relocatable so that
	# it's possible to use setuptools and build C extensions.  I don't understand why python doesn't
	# already do this -- maybe there is some subtle edge case that makes it impossible to do
	# in general?  Or maybe people don't relocate python installs then build.  I don't know.
	cat ${SRC}/patches/17-fix-sysconfigdata.py >> ${DIST_WASM}/lib/python3.11/_sysconfigdata__wasi_wasm32-wasi.py

	# We also copy the posix-wasm.h that was used for the build, so that building C extensions isn't
	# complicated by trying to find this.
	cp -v ${POSIX_WASM}/*.h ${DIST_WASM}/include/python3.11/

	touch ${DIST_WASM}/.built


###########
# Installing pip and setuptools
# We can only do this after ../packages/python-wasm is built, which depends on dylink
# (which depends on cpython) and many other things.  So this target is invoked later.
# NOTE: If you do "make clean-wasm", then "make", be sure to also do "make pip".
###########
${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built: ${DIST_WASM}/.built
	rm -rf ${DIST_WASM}/lib/python*/site-packages/*pip* ${DIST_WASM}/lib/python*/site-packages/*setuptools*
	${CWD}/bin/python-wasm -m ensurepip
	# We apply one patch to support building C++ extensions.  Without this, the numpy
	# build fails pretty quickly. This is needed due to our hacky approach to -fPIC.
	cd ${DIST_WASM} && cat ${SRC}/patches/10-setuptools-c++.patch | patch -p1
	# It would be much nicer to implement a better mmap.  But for now, let's just patch it out:
	cd ${DIST_WASM} && cat ${SRC}/patches/15-pip-no-mmap.patch | patch -p1
	# It would be better to have a better fallback for threads that works in some cases so we
	# don't need this. But for now, just remove it:
	cd ${DIST_WASM} && cat ${SRC}/patches/16-pip-no-auto-refresh-progress.patch  | patch -p1
	touch ${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built

pip: ${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built
.PHONY: pip


# Run the full official Python test suite on the wasm build.  We can't just do
# "make test" in build/wasm, since that only support wasmtime and emscripten.
# Also, we can't use our WASM python to orchestrate this (yet), since the
# test suite runner uses threads (and anyways, we like the speedup from multithreading).
# However, you set line 543 to
#         self.ns.use_mp = 0
# of dist/wasm/lib/python3.11/test/libregrtest/main.py then it works, but of course
# with a single process, which is very slow. So we stick with python-native for testing.
RUN_TESTS = _PYTHON_PROJECT_BASE=${BUILD_WASM} \
	_PYTHON_HOST_PLATFORM=wasi-wasm32 \
	PYTHONPATH=${DIST_WASM}/lib/python3.11 \
	_PYTHON_SYSCONFIGDATA_NAME=_sysconfigdata__wasi_wasm32-wasi \
	${DIST_NATIVE}/bin/python3 \
	./Tools/scripts/run_tests.py \
	 --python=${PYTHON_WASM}

# We use a restricted PATH for running tests.  On Linux I had a lot of trouble
# with some random binaries in random places causing hangs, and this provides
# a cleaner environment.
TEST_PATH=${BIN}:/bin:/usr/bin

test-all: wasm native
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS}
.PHONY: test-all


# I got this list using this on the output:
#     grep passed out | awk '{print $(NF - 1)}' | tr '\n' ' '
SUPPORTED_TEST_DESC = "the **supported-by-python-wasm** cpython test suites"
SUPPORTED_TESTS = test_atexit test_base64 test_calendar test_capi test_cgitb  test_compile test_eof test_fstring test_graphlib test_gzip test_hash test_import test_inspect  test_module test_ntpath test_popen test_posixpath test_py_compile test_pydoc  test_quopri  test_script_helper test_source_encoding test_struct test_tabnanny test_tarfile test_trace test_unicodedata test_weakref test___all__ test___future__ test__locale test__opcode test__osx_support test_abc test_abstract_numbers test_aifc test_argparse test_array test_ast test_audioop test_augassign test_baseexception test_bdb test_bigaddrspace test_bigmem test_binascii test_binop test_bisect test_bool test_buffer test_bufio test_bz2 test_call test_cgi test_charmapcodec test_class test_cmath test_cmd test_code_module test_codeccallbacks test_codecencodings_cn test_codecencodings_hk test_codecencodings_iso2022 test_codecencodings_jp test_codecencodings_kr test_codecencodings_tw test_codecmaps_cn test_codecmaps_hk test_codecmaps_jp test_codecmaps_kr test_codecmaps_tw test_codeop test_collections test_colorsys test_compare test_complex test_configparser test_contains test_context test_contextlib test_copy test_copyreg test_crashers test_crypt test_csv test_dataclasses test_datetime test_dbm test_dbm_dumb test_decimal test_decorators test_defaultdict test_deque test_descr test_descrtut test_dict test_dict_version test_dictcomps test_dictviews test_difflib test_dis test_doctest2 test_dynamic test_dynamicclassattribute test_eintr test_email test_ensurepip test_enum test_enumerate test_errno test_except_star test_exception_group test_exception_hierarchy test_exception_variations test_extcall test_file test_filecmp test_fileinput test_fileutils test_finalization test_float test_flufl test_fnmatch test_format test_fractions test_frame test_frozen test_funcattrs test_functools test_future test_future3 test_future4 test_future5 test_generator_stop test_genericalias test_genericclass test_genericpath test_genexps test_getargs2 test_getopt test_getpath test_gettext test_global test_grammar test_hashlib test_heapq test_hmac test_html test_htmlparser test_http_cookiejar test_http_cookies test_imghdr test_index test_int test_int_literal test_ipaddress test_isinstance test_iter test_iterlen test_itertools test_keyword test_keywordonlyarg  test_lib2to3 test_linecache test_list test_listcomps test_lltrace test_locale test_long test_longexp test_lzma test_mailcap test_math test_memoryio test_memoryview test_metaclass test_mimetypes test_minidom test_modulefinder test_multibytecodec test_named_expressions test_netrc  test_numeric_tower test_opcache test_opcodes test_operator test_optparse test_ordered_dict test_osx_env test_patma test_peepholer test_peg_generator test_pep646_syntax test_pickle test_picklebuffer test_pickletools test_pipes test_pkg test_pkgutil test_plistlib test_positional_only_arg test_pow test_pprint test_print test_property test_pulldom test_pyclbr test_pyexpat test_raise test_random test_range test_re test_reprlib test_richcmp test_rlcompleter test_sax test_sched test_scope test_secrets test_set test_setcomps test_shelve test_shlex test_slice test_sndhdr test_sort  test_statistics test_strftime test_string test_string_literals test_stringprep test_strptime test_strtod test_structmembers test_structseq test_subclassinit test_sunau test_sundry test_super test_symtable test_syntax test_textwrap test_threadsignals test_timeit  test_tokenize test_tomllib test_tuple test_type_annotations test_type_cache test_type_comments test_typechecks test_types test_ucn test_unary test_unicode_file test_unicode_file_functions test_unicode_identifiers test_univnewlines test_unpack test_unpack_ex test_unparse test_urlparse test_userdict test_userlist test_userstring test_utf8source test_uu test_uuid test_wave test_weakset test_with test_xdrlib test_xml_dom_minicompat test_xml_etree_c test_xxtestfuzz test_yield_from test_zipimport test_zlib test_zoneinfo test_cprofile test_pstats test_profile test_tempfile test_sys_setprofile


${BIN}/python-wasm: ${DIST_WASM}/.built ${CWD}/bin/python-wasm
	ln -sf ${CWD}/bin/python-wasm ${BIN}/python-wasm

.PHONY: python-wasm
python-wasm: ${BIN}/python-wasm

test-pip: pip
	echo "Testing PIP"
	${CWD}/bin/python-wasm -m pip |grep Usage
	echo "Success"
.PHONY: test-pip


# Some tests can be pretty slow, e.g., test_tarfile takes about a minute or more on a FAST computer,
# and doing 4 in parallel on a slow computer.
test: wasm native ${BIN}/python-wasm test-pip
	echo "Running ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS}  -j4 --timeout=600 ${SUPPORTED_TESTS}
	echo "Ran ${SUPPORTED_TEST_DESC}"
.PHONY: test

PASSED_WITHOUT_SUBPROCESS_DESC = "These tests all passed without subprocess or socket support enabled, but fail with it."
PASSED_WITHOUT_SUBPROCESS = test_timeout test_stat test_robotparser test_nntplib test_largefile test_logging test_audit test_bytes test_c_locale_coercion test_cmd_line_script test_compileall test_coroutines test_exceptions test_gc test_json test_marshal test_runpy test_site  test_traceback test_unicode test_utf8_mode test_warnings

test-passed-without-subprocess: wasm native
	echo "Running ${PASSED_WITHOUT_SUBPROCESS_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS}  --timeout=180 -j4 ${PASSED_WITHOUT_SUBPROCESS}
	echo "Ran ${PASSED_WITHOUT_SUBPROCESS_DESC}"


# One test fails here due to the fact that the PYTHONHOME is different in webworker mode (since the files are in the zip archive).
test-worker: wasm native
	echo "Running using webworker -- ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} PYTHONHOME=${DIST_WASM} ${RUN_TESTS}  -j4 --timeout=180 ${SUPPORTED_TESTS}
	echo "Ran using webworker -- ${SUPPORTED_TEST_DESC}"

# NOTES:
#  test_pydoc - sometimes randomly hangs, mainly on linux.
# test_sys and test_platform -- I think crashes caused by installing too much and running native subprocesses; eventually we won't run anything native... (these work on most platform but I have an ubuntu docker container where they fail)
#
# test_code test_cppext  fail because of libffi not being done.
#
FAILED_TEST_DESC = "All **unsuppported** and known failing cpython test suites: this is less than 10% of the non-skipped cpython test suite.  We want to fix all of these."
FAILED_TESTS = test_code test_cppext  test_readline test_builtin  test_sys test_platform  test_getpass test_codecs   test_distutils test_fileio test_generators test_glob test_imp test_importlib  test_io    test_openpty test_os test_pathlib   test_posix          test_shutil test_signal  test_sqlite3  test_support  test_sysconfig    test_time  test_tracemalloc test_typing   test_unittest  test_xml_etree test_zipapp test_zipfile


test-failed:  wasm native
	echo "Running ${FAILED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS} --timeout=180 -j4 ${FAILED_TESTS}
	echo "Ran ${FAILED_TEST_DESC}"


TEST=test_long
test-one:   wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS} --timeout=60 -v ${TEST}
.PHONY: test-one

test-one-worker: wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS} -j1 --timeout=60 -v ${TEST}
.PHONY: test-one


SKIPPED_TEST_DESC = "all **skipped** cpython test suites.  Extend what cpython wasm can do to include more of these."
SKIPPED_TESTS = test_asdl_parser test__xxsubinterpreters test_asyncgen test_asynchat test_asyncio test_asyncore test_check_c_globals test_clinic test_cmd_line test_concurrent_futures test_contextlib_async test_ctypes test_curses test_dbm_gnu test_dbm_ndbm test_devpoll test_doctest test_docxmlrpc test_dtrace test_embed test_epoll test_faulthandler test_fcntl test_file_eintr test_fork1 test_ftplib test_gdb test_grp test_httplib test_httpservers test_idle test_imaplib test_interpreters test_ioctl test_kqueue test_launcher test_mailbox test_mmap test_msilib test_multiprocessing_fork test_multiprocessing_forkserver test_multiprocessing_main_handling test_multiprocessing_spawn test_nis test_ossaudiodev test_pdb test_poll test_poplib test_pty test_pwd test_queue test_regrtest test_repl test_resource test_select test_selectors test_smtpd test_smtplib test_smtpnet test_socket test_socketserver test_spwd test_ssl test_stable_abi_ctypes test_startfile test_subprocess test_sys_settrace test_syslog test_tcl test_telnetlib test_thread test_threadedtempfile test_threading test_threading_local test_tix test_tk test_tools test_ttk_guionly test_ttk_textonly test_turtle test_urllib test_urllib2 test_urllib2_localnet test_urllib2net test_urllib_response test_urllibnet test_venv test_wait3 test_wait4 test_webbrowser test_winconsoleio test_winreg test_winsound test_wsgiref test_xmlrpc test_xmlrpc_net test_xxlimited test_zipfile64 test_zipimport_support

test-skipped:  wasm native
	echo "Running ${SKIPPED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} ${RUN_TESTS}  --timeout=60 ${SKIPPED_TESTS}
	echo "Ran ${SKIPPED_TEST_DESC}"


# This is sort of like the 'assets' thing that is part of cpython, but it's
# much more useful (but less small).
${DIST_WASM}/.publishable: wasm
	# Do not need the tests in the published version -- they're huge
	rm -rf ${DIST_WASM}/lib/python3.11/test

	# Graphics -- Remove idle which we are nowhere near supporting (and is big):
	rm -rf ${DIST_WASM}/lib/python3.11/idlelib
	rm -rf ${DIST_WASM}/lib/python3.11/*tkinter
	rm -rf ${DIST_WASM}/lib/python3.11/turtle*

	# Temporarily make it into a package so that we can bundle it
	touch ${DIST_WASM}/lib/python3.11/__init__.py
	# Bundle it -- using python-native since it's more compressed:
	cd ${DIST_WASM}/lib/ && ${CWD}/bin/python-wasm -m cowasm_bundler python3.11
	# Move it out of the way
	mv ${DIST_WASM}/lib/python3.11 ${DIST_WASM}/lib/python3.11.orig
	# Extract bundle
	cd ${DIST_WASM}/lib/ && tar xf python3.11.tar.xz
	# Remove __init__.pyc
	rm -f ${DIST_WASM}/lib/python3.11/__init__.pyc
	# Also site-packages
	mkdir ${DIST_WASM}/lib/python3.11/site-packages
	# Move compiled so files over
	mv ${DIST_WASM}/lib/python3.11.orig/lib-dynload ${DIST_WASM}/lib/python3.11/
	# Compress libpython3.11 to save 20MB decompressed.  Note that this obviously
	# complicates the python-wasm package which has to explicitly copy this out and decompress it.
	xz ${DIST_WASM}/lib/libpython3.11.a
	# Remove stuff
	rm -rf ${DIST_WASM}/lib/python3.11.tar.xz ${DIST_WASM}/lib/python3.11.orig
	touch ${DIST_WASM}/.publishable

.PHONY: publishable
publishable: ${DIST_WASM}/.publishable
