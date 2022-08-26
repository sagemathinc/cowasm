include ../build/Makefile-vars

#
# We build a native version of CPython and a WASM version.
# The native version is ONLY used as part of the cross compilation build process
# and not used for anything else.  TODO: Currently, we can't build native Python using
# only zig on our supported architectures, so we use the native toolchain, which is
# really annoying and makes bootstraping a build a little harder.
#
# We only build a *shared* -fPIC version of the WASM version by using our zig-fPIC
# wrapper script, which is in the dylink package.
#
# See https://www.python.org/downloads/
PYTHON_MAJOR = 3
PYTHON_MINOR = 11
PYTHON_PATCH = 0
PYTHON_BETA = rc1
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

URL = https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}${PYTHON_BETA}.tar.xz
TARBALL = ${UPSTREAM}/python-${PYTHON_VERSION}.tar.xz

ZLIB = ${PACKAGES}/zlib/dist
LIBEDIT = ${PACKAGES}/libedit/dist
POSIX_WASM = ${PACKAGES}/posix-wasm/dist

NCURSES = ${PACKAGES}/ncurses/dist
NCURSES_INCLUDE = -I${NCURSES}/wasm/include/ncurses -I${NCURSES}/wasm/include
NCURSES_LIB = -L${NCURSES}/wasm/lib

PYTHON_WASM = ${BIN}/python-wasm
PYTHON_WASM_DEBUG = ${BIN}/python-wasm-debug

# We only use zlib (not lzma) for native build, since liblzma widely available natively.
export DYLD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export LD_LIBRARY_PATH := ${DIST_NATIVE}/lib:${ZLIB}/native/lib
export PATH := ${DIST_NATIVE}/bin:${PATH}

# Default target
all: native ${BIN}/python-native wasm

${DIST}/.built: native wasm
	touch ${DIST}/.built

include ../build/Makefile-rules


## NATIVE

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
        UNAME_M := $(shell uname -m)
	# Workaround a zig bug -- the native build fails with "ld.lld: error: undefined symbol: fcntl64".
	# See https://github.com/ziglang/zig/issues/5882 and https://github.com/ziglang/zig/issues/9485
	# NOTE: we use musl instead of gnu.2.31, since musl works on CoCalc (a massive messy huge Linux
	# environment), wheras gnu.2.31 only worked on several minimal linux envs.
	ARCH = --target=$(UNAME_M)-linux-musl
else
	ARCH =
endif

${BUILD_NATIVE}/.build:: ${TARBALL}
	cp src/Setup.local-native ${BUILD_NATIVE}/Modules/Setup.local

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&& 	AR="zig ar" \
			CXX="zig c++ ${ARCH} " \
			CC="zig cc ${ARCH} " \
			CFLAGS="-I${ZLIB}/native/include -I${LIBEDIT}/native/include" \
			LDFLAGS="-L${ZLIB}/native/lib -L${LIBEDIT}/native/lib" \
			./configure \
				--prefix=${DIST_NATIVE} \
				--with-ensurepip=no \
				--with-readline=editline
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses
	# zlib).  This is to workaround a security feature of MacOS (see
	# https://developer.apple.com/forums/thread/9233). For simplicity we set this on all hosts.
	cd ${BUILD_NATIVE} \
		&&	make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" \
		&&	make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" install
	touch ${DIST_NATIVE}/.built

${BIN}/python-native: bin/python-native
	rm -f ${BIN}/python-native
	ln -s `pwd`/bin/python-native ${BIN}/python-native

# Use "make run-native" to run native python at the command line.
.PHONY: run-native
run-native: ${DIST_NATIVE}/.built
	bin/python-native


## WASM

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# Scripts to make it easy to change CPython and rebuild iteratively
	ln -s ${CWD}/src/rebuild ${BUILD_WASM}/rebuild
	# Script to make it easy to change shared modules and rebuild them.
	ln -s ${CWD}/src/rebuild-shared ${BUILD_WASM}/rebuild-shared
	# Copy the config.site, which answers questions needed for
	# cross compiling, without which ./configure won't work.
	cp src/config.site ${BUILD_WASM}
	# Configure how modules are built
	cp src/Setup.local ${BUILD_WASM}/Modules/Setup.local
	# Make empty sys/wait.h so that python's configure will conclude that we have sys/wait.h; we will
	# explicitly add anything that is really used from there to posix-wasm.h
	mkdir ${BUILD_WASM}/sys && echo '#include "posix-wasm.h"' >  ${BUILD_WASM}/sys/wait.h
	# Apply our patches:
	cd ${BUILD_WASM} && cat ${CWD}/src/python-patches/01-subprocess.patch | patch -p1
	cd ${BUILD_WASM}/Lib && cat ${CWD}/src/python-patches/02-pydoc.patch | patch -p0
	cd ${BUILD_WASM}/Tools/wasm/ && cat ${CWD}/src/python-patches/03-wasm-assets.patch | patch -p0
	touch ${BUILD_WASM}/.patched

# The options for the extension modules.  We cannot strip later. The -s option to BLDSHARED
# below strips debug symbols from the shared object libraries for extension modules,
# as explained here:
#     https://stackoverflow.com/questions/6085491/gcc-vs-clang-symbol-stripping
# It would be nicer to build them with the symbols in (the default), then use wasm-strip
# later when packaging things up.  Unfortunately, wasm-strip only implements "strip everything",
# not just debug symbols.  There's code here  https://reviews.llvm.org/D73820 for the general
# case, but I guess it isn't merged.
# NOTE: if you're debugging, do
#    cd build/wasm
#    ./rebuild-shared
# to rebuild the shared modules, which *always* builds them with debugging symbols enabled.
# Keep the following in sync with src/rebuild-shared:
BLDSHARED_DEBUG = zig wasm-ld --experimental-pic -shared
BLDSHARED_PROD = ${BLDSHARED_DEBUG}  -s --compress-relocations
# what we will use:
BLDSHARED = ${BLDSHARED_PROD}

${DIST_WASM}/.built-cpython: ${BUILD_WASM}/.patched ${DIST_NATIVE}/.built
	# - Important to set CXX even though it's not in the main build so zig is used for C++ extension modules.
	# - with-pymalloc it actually works and seems faster
	# - We use "zig cc -target wasm32-wasi" instead of "zig cc -target wasm32-wasi-musl" since the broken
	#   Python configure.ac script outputs wasm32-wasi instead of wasm32-wasi-musl as the PLATFORM_TRIPLE.
	#   This might be something to fix and upstream, but for now, just not using a triple works.
	# - We use -I (path to source) in the CC/CXX line in addition to CFLAGS so that we can override some
	#   bad global libraries, e.g., systemwide (zig musl) sys/wait.h with a local version.
	# - In Python source they lower the default recursion limit; however, we don't need that since our
	#   runtime is Chromium, not wasitime and we can handle huge limits (see Include/internal/pycore_ceval.h).
	# - enable-ipv6, since I put a lot of work into this for posix-zig!
	# --with-pkg-config=no, this is CRITICAL; otherwise, if pkg-config is installed, then python's build system
	#   will use it and pick up system-wide libraries that are not supported by WASM, which is a huge pain
	#   that leads to subtle bugs.  One example of this is "uuid". (TODO: bug report: should be disabled when cross compiling?)
	# - DPy_DEFAULT_RECURSION_LIMIT=700:
	#       - with -Oz, a limit of 1000 causes test_userdict to fail when testing on
	#         nodejs linux (it works on mac).  test_userlist is even worse.
	#       - with -oZ, test_richcmp.py fails with a limit above 750; a limit of max of 720 works on node on linux.
	#         Changing to -O3 makes no difference.
	cd ${BUILD_WASM} && \
		CC="zig cc -O3 -target wasm32-wasi" \
		CXX="zig c++ -O3 -target wasm32-wasi" \
		AR="zig ar" \
		CFLAGS="-D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -I${BUILD_WASM} -I${POSIX_WASM}/wasm -DPy_DEFAULT_RECURSION_LIMIT=700" \
		CONFIG_SITE=./config.site \
		READELF=true \
		./configure \
			--config-cache \
			--prefix=${DIST_WASM}  \
			--enable-big-digits=30 \
			--enable-optimizations \
			--enable-ipv6 \
			--disable-shared \
			--with-pkg-config=no \
			--with-readline=editline \
			--with-build-python=${CWD}/bin/python-native \
			--with-pymalloc \
			--without-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	cat src/pyconfig.h >> ${BUILD_WASM}/pyconfig.h
	# NOTE: I have seen "error: unable to build WASI libc CRT file: FileNotFound" when using "make -j8",
	# and had it go away when removing parallel build.  It's working now.
	cd ${BUILD_WASM} && make -j8
	# Now build the shared extension modules, which requires some deep trickiery with zig/clang/wasm-ld
	# via the zig-fPIC script.  First remove everything that possibly needs to be built -fPIC or the
	# build will not rebuild what it needs to build.  We just delete all .o files, so this takes longer
	# since many of these are NOT shared.  But it works.
	cd ${BUILD_WASM}/Modules && find . -name "*.o" -type f -delete
	# Do the build, but with fPIC this time.  We also have to pass some *_LDFLAGS to keep
	# from using -lm, which isn't needed or supported by "zig wasm-ld" with the options we're using.
	# Parallel build is fine for this, unlike above.
	cd ${BUILD_WASM} && \
		make -j8 \
		CONFIGURE_LDFLAGS_NODIST="" \
		LINKFORSHARED="-shared" \
		MODULE__DECIMAL_LDFLAGS="Modules/_decimal/libmpdec/libmpdec.a" \
	 	MODULE_PYEXPAT_LDFLAGS="Modules/expat/libexpat.a" \
		CC="zig-fPIC cc" \
		CXX="zig-fPIC c++" \
		BLDSHARED="${BLDSHARED}"
	# Install as usual.
	cd ${BUILD_WASM} && make install
	touch ${DIST_WASM}/.built-cpython

.PHONY:
wasm-cpython: ${DIST_WASM}/.built-cpython

${DIST_WASM}/.built: ${DIST_WASM}/.built-cpython
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD_WASM} && \
		mkdir -p usr/local/lib/python3.11/lib-dynload/  && \
	    LD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" DYLD_LIBRARY_PATH="${DIST_NATIVE}/lib:${ZLIB}/native/lib" \
			python3 ./Tools/wasm/wasm_assets.py && \
		rm -rf ${DIST_WASM}/lib/dist && \
		mv usr/local/lib ${DIST_WASM}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp src/termcap ${DIST_WASM}/lib/dist/termcap && cd ${DIST_WASM}/lib/dist/ && zip -u python311.zip termcap
	# **TODO:** It is very silly for these to be in the same zip file, obviously, because that means they have to be downloaded,
	# so we should just put them in the main binary.  We'll change that when things are working.
	mkdir ${DIST_WASM}/lib/dist/lib-dynload/
	cp -v ${DIST_WASM}/lib/python3.11/lib-dynload/*.so ${DIST_WASM}/lib/dist/lib-dynload/
	# Unfortunately, wasm-strip removes the critical custom section that makes the so file useful, since NotImplementedError
	#      https://reviews.llvm.org/D73820
	#find ${DIST_WASM}/lib/dist/lib-dynload -type f -name "*.so" | xargs -n1 ${CWD}/node_modules/.bin/wasm-strip
	# Instead, we use the -s option to wasm-ld above.
	cd ${DIST_WASM}/lib/dist/; zip -u python311.zip lib-dynload/*
	touch ${DIST_WASM}/.built

# Use "make run-wasm" to run our WASM python at the command line.
# You can also just run `python-wasm` in the top level bin/ directory.
.PHONY: run-wasm
run-wasm: wasm
	${PYTHON_WASM}

# Run the full official Python test suite on the wasm build.  We can't just do
# "make test" in build/wasm, since that only support wasmtime and emscripten.
RUN_TESTS =  _PYTHON_PROJECT_BASE=${BUILD_WASM} \
	_PYTHON_HOST_PLATFORM=wasi-wasm32 \
	PYTHONPATH=${BUILD_WASM}/build/lib.wasi-wasm32-3.11:./Lib \
	_PYTHON_SYSCONFIGDATA_NAME=_sysconfigdata__wasi_wasm32-wasi \
	${DIST_NATIVE}/bin/python3 \
	./Tools/scripts/run_tests.py

test-all: wasm native
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS}
.PHONY: test-all


# I got this list using this on the output:
#     grep passed out | awk '{print $(NF - 1)}' | tr '\n' ' '
SUPPORTED_TEST_DESC = "all **supported** cpython test suites -- this is about 83% of the full cpython test suite."
SUPPORTED_TESTS = test_posixpath test_pkgutil test_py_compile test_compileall test_compile test_richcmp test_plistlib test_runpy test_readline test_lzma test_capi test_userlist test_userdict  test_gzip test_exceptions test_numeric_tower test_unicode_identifiers test_typechecks test___future__ test_buffer test_getpath test_class test_sundry test_property test_datetime test_ordered_dict test_popen test_string_literals test_struct test_type_cache test_univnewlines test_unary test_gettext test_frame test_nntplib test_bdb test_email test_timeout test_index test_set test_int_literal test_getpass test_codecmaps_tw test_genericpath test_platform test_defaultdict test_iterlen test_cmd_line_script test_float test_exception_hierarchy test_codecmaps_cn test_type_annotations test_dict_version test_pyclbr test_abstract_numbers test_dataclasses test_xdrlib test_getopt test_keyword test_configparser test_mailcap test_cmd test_codecmaps_hk test_utf8_mode test_binascii test_wave test_int test_http_cookiejar test_site test_subclassinit test_bigmem test_gc test_zlib test_cgitb test_dynamic test_dis test_future test_future3 test_list test_picklebuffer test_marshal test_random test_deque test_osx_env test_cmath test_crypt test_sys test_string test_context test_doctest2 test_ucn test_urlparse test_warnings test_exception_group test_positional_only_arg test_functools test_long test_pep646_syntax test_codeop test_contains test_zipimport test_slice test_codecencodings_cn test_calendar test_syntax test_weakref test_asdl_parser test_fractions test_finalization test_tokenize test_bigaddrspace test_errno test_fnmatch test_codecencodings_hk test_sched test_trace test_codecmaps_jp test_operator test_bytes test_bufio test_iter test_unparse test_array test_sax test_strptime test_multibytecodec test_netrc test_funcattrs test_print test_with test_binop test_pickle test_http_cookies test_mimetypes test_hashlib test_patma test_cppext test_peg_generator test_named_expressions test_builtin test_contextlib test_xml_dom_minicompat test_pow test_codecencodings_kr test_decorators test__osx_support test_unpack test_difflib test_unpack_ex test_eof test_colorsys test_utf8source test_unicodedata test_secrets test_ipaddress test_htmlparser test_memoryview test_textwrap test_cgi test_copyreg test_bool test_weakset test_atexit test_html test_bisect test_code_module test_enumerate test_fileutils test_type_comments test_codeccallbacks test_genericclass test_copy test_codecencodings_jp test_super test_opcodes test_pulldom test_itertools test_file test___all__ test_future5 test_minidom test_codecencodings_tw test__locale test_stringprep test_dictcomps test_unicode test_dict test_codecmaps_kr test_robotparser test_sndhdr test_xxtestfuzz test_structmembers test_strtod test_re test_pprint test_keywordonlyarg test_collections test_types test_range test_imghdr test_ast test_metaclass test_pickletools test_math test_format test_isinstance test_tuple test_statistics test_hmac test_yield_from test_aifc test_uu test_symtable test_fstring test_exception_variations test_except_star test_shlex test_csv test_descrtut test_descr test_userstring test_crashers test_sort test_setcomps test_eintr test_graphlib test_ntpath test_augassign test_frozen test_genericalias test__opcode test_enum test_coroutines test_getargs2 test_memoryio test_extcall test_xml_etree_c test_largefile test_opcache test_compare test_pyexpat test_json test_locale test_strftime test_argparse test_baseexception test_codecencodings_iso2022 test_decimal test_grammar test_dynamicclassattribute test_generator_stop test_complex test_c_locale_coercion test_listcomps test_linecache test_abc test_optparse test_global test_timeit test_sunau test_lltrace test_pkg test_module test_structseq test_threadsignals test_genexps test_charmapcodec test_flufl test_traceback test_audioop test_hash test_quopri test_scope test_reprlib test_dictviews test_audit test_script_helper test_code test_raise test_call test_rlcompleter test_peepholer test_heapq test_future4 test_import test_longexp test_base64

test: wasm native
	echo "Running ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS} -j8 ${SUPPORTED_TESTS}
	echo "Ran ${SUPPORTED_TEST_DESC}"
.PHONY: test

# One test fails here due to the fact that the PYTHONHOME is different in webworker mode (since the files are in the zip archive).
test-worker: wasm native
	echo "Running using webworker -- ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && PYTHONHOME=${DIST_WASM} _PYTHON_HOSTRUNNER=${PYTHON_WASM} ${RUN_TESTS} -j8 ${SUPPORTED_TESTS}
	echo "Ran using webworker -- ${SUPPORTED_TEST_DESC}"

FAILED_TEST_DESC = "all **unsuppported** and known failing cpython test suites -- this is about 17% of the full cpython test suite.  Help fix these, please!"
FAILED_TESTS = test_dbm test_bz2 test_codecs test_cprofile test_dbm_dumb test_distutils test_ensurepip test_filecmp test_fileinput test_fileio test_generators test_glob test_imp test_importlib test_inspect test_io test_lib2to3 test_logging test_modulefinder test_openpty test_os test_pathlib test_pipes  test_posix  test_profile test_pstats  test_pydoc    test_shelve test_shutil test_signal test_source_encoding test_sqlite3 test_stat test_support test_sys_setprofile test_sysconfig test_tabnanny test_tarfile test_tempfile test_time test_tomllib test_tracemalloc test_typing test_unicode_file test_unicode_file_functions test_unittest test_uuid test_xml_etree test_zipapp test_zipfile test_zoneinfo

test-failed:  wasm native
	echo "Running ${FAILED_TEST_DESC}"
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS} ${FAILED_TESTS}
	echo "Ran ${FAILED_TEST_DESC}"


TEST=test_long
test-one:   wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS} -j1 -v ${TEST}
.PHONY: test-one

test-one-worker: wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM} ${RUN_TESTS} -j1 -v ${TEST}
.PHONY: test-one


SKIPPED_TEST_DESC = "all **skipped** cpython test suites.  Extend what cpython wasm can do to include more of these."
SKIPPED_TESTS = test__xxsubinterpreters test_asyncgen test_asynchat test_asyncio test_asyncore test_check_c_globals test_clinic test_cmd_line test_concurrent_futures test_contextlib_async test_ctypes test_curses test_dbm_gnu test_dbm_ndbm test_devpoll test_doctest test_docxmlrpc test_dtrace test_embed test_epoll test_faulthandler test_fcntl test_file_eintr test_fork1 test_ftplib test_gdb test_grp test_httplib test_httpservers test_idle test_imaplib test_interpreters test_ioctl test_kqueue test_launcher test_mailbox test_mmap test_msilib test_multiprocessing_fork test_multiprocessing_forkserver test_multiprocessing_main_handling test_multiprocessing_spawn test_nis test_ossaudiodev test_pdb test_poll test_poplib test_pty test_pwd test_queue test_regrtest test_repl test_resource test_select test_selectors test_smtpd test_smtplib test_smtpnet test_socket test_socketserver test_spwd test_ssl test_stable_abi_ctypes test_startfile test_subprocess test_sys_settrace test_syslog test_tcl test_telnetlib test_thread test_threadedtempfile test_threading test_threading_local test_tix test_tk test_tools test_ttk_guionly test_ttk_textonly test_turtle test_urllib test_urllib2 test_urllib2_localnet test_urllib2net test_urllib_response test_urllibnet test_venv test_wait3 test_wait4 test_webbrowser test_winconsoleio test_winreg test_winsound test_wsgiref test_xmlrpc test_xmlrpc_net test_xxlimited test_zipfile64 test_zipimport_support

test-skipped:  wasm native
	echo "Running ${SKIPPED_TEST_DESC}"
	cd ${BUILD_WASM} && _PYTHON_HOSTRUNNER=${PYTHON_WASM_DEBUG} ${RUN_TESTS} ${SKIPPED_TESTS}
	echo "Ran ${SKIPPED_TEST_DESC}"
