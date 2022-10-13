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
PYTHON_BETA = rc2
PYTHON_VERSION = ${PYTHON_MAJOR}.${PYTHON_MINOR}.${PYTHON_PATCH}

URL = https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}${PYTHON_BETA}.tar.xz
TARBALL = ${UPSTREAM}/python-${PYTHON_VERSION}-${PYTHON_BETA}.tar.xz

ZLIB = ${PACKAGES}/zlib/dist
LIBEDIT = ${PACKAGES}/libedit/dist
POSIX_WASM = ${PACKAGES}/posix-wasm/dist

# NCURSES = ${PACKAGES}/ncurses/dist
# NCURSES_INCLUDE = -I${NCURSES}/wasm/include/ncurses -I${NCURSES}/wasm/include
# NCURSES_LIB = -L${NCURSES}/wasm/lib

ZYTHON = ${BIN}/zython
ZYTHON_DEBUG = ${BIN}/zython-debug

# Either -Oz or -O3 make sense to me...
#   -O0 = exceeds a limit so can't even load the result with webassembly!
# The cPython default opt is "-DNDEBUG -g -fwrapv -O3 -Wall", which is
# coded in the generated Makefile.  I have noticed some major compiler bugs
# with -O3, so we can revisit this later with newer LLVM/zig releases.
# For example:
#   https://github.com/sagemathinc/zython/issues/27
# is a bug with -O3 that goes away with -Oz. The diff in performance
# is less than 5% with -O3 over -Oz.
WASM_OPT=-DNDEBUG -g -fwrapv -Wall -Oz


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

${BUILD_NATIVE}/.build:: ${TARBALL}
	cp src/Setup.local-native ${BUILD_NATIVE}/Modules/Setup.local
	# This _scproxy is needed macos *only* for pip; on Linux it breaks the build.
	if [ `uname -s` == "Darwin" ]; then echo "_scproxy _scproxy.c" >> ${BUILD_NATIVE}/Modules/Setup.local; fi

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&& 	AR="zig ar" \
			CXX="zig c++ ${ZIG_NATIVE_CFLAGS}" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
			CFLAGS="-I${ZLIB}/native/include -I${LIBEDIT}/native/include" \
			LDFLAGS="-L${ZLIB}/native/lib -L${LIBEDIT}/native/lib" \
			./configure \
				--prefix=${DIST_NATIVE} \
				--with-ensurepip \
				--disable-shared \
				--with-readline=editline
	# We **must** explicitly set RUNSHARED on MacOS since it's wrong there (e.g., it misses
	# zlib).  This is to workaround a security feature of MacOS (see
	# https://developer.apple.com/forums/thread/9233). For simplicity we set this on all hosts.
	cd ${BUILD_NATIVE} \
		&&	make -j8 RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" \
		&&	make RUNSHARED="DYLD_LIBRARY_PATH=${BUILD_NATIVE}:${DYLD_LIBRARY_PATH} LD_LIBRARY_PATH=${BUILD_NATIVE}:${LD_LIBRARY_PATH}" install
	cp ${SRC}/zython_bundler.py ${DIST_NATIVE}/lib/python3.11/site-packages
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
	cd ${BUILD_WASM}/Lib && cat ${CWD}/src/patches/02-pydoc.patch | patch -p0
	cd ${BUILD_WASM}/Tools/wasm/ && cat ${CWD}/src/patches/03-wasm-assets.patch | patch -p0
	# Apply this patch when we want to take testing to the next level, and fully enable all
	# tests that involve subprocess support.  Our goal is to support subprocesses fully, but
	# it is NOT to support fork, which is just not possible in general with WebAssembly.
	# However, I believe subprocess support is possible in a fully solid robust way.
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/04-enable-subprocess-tests.patch | patch -p1
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/05-st_mode.patch | patch -p1
	# Implement 'import platform; platform.architecture()' for wasm.
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/06-platform.patch | patch -p1
	# Fork and execv on top of posix-node work, but it takes some restrictions to be robust:
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/07-subprocess.patch | patch -p1
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/08-unicode-file-test.patch | patch -p1
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/09-set-inheritable.patch | patch -p1
	# Patch 10-setuptools-c++.patch is used, but only *AFTER* ensurepip happens!
	# This patch 11 is needed for clang15, which detects a bug in a declaration added for wasm support.
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/11-descrobject-clang15.patch | patch -p1
	# clang15 is more strict:
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/12-timemodule-clang15.patch | patch -p1
	# We can't use the modified WASI socket.h headers, since they annoyingly render the
	# data structure useless (why!?). See packages/python-wasm/src/wasm/posix/socket.zig
	cd ${BUILD_WASM} && cat ${CWD}/src/patches/13-socket-unmodified-headers.patch | patch -p1
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
	#   so it doesn't help.  That's fine, since we can't run zython yet until building ../zython anyways.
	cd ${BUILD_WASM} && \
		OPT="${WASM_OPT}" \
		CC="zig cc -target wasm32-wasi" \
		CXX="zig c++ -target wasm32-wasi" \
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
			--with-ensurepip \
			--host=wasm32-unknown-wasi \
			--build=`./config.guess`
	cat src/pyconfig.h >> ${BUILD_WASM}/pyconfig.h
	# NOTE: I have seen "error: unable to build WASI libc CRT file: FileNotFound" when using "make -j8",
	# and had it go away when removing parallel build.
	cd ${BUILD_WASM} && make

	# Now build the shared extension modules, which requires some deep trickiery with zig/clang/wasm-ld
	# via the zig-fPIC script.  First remove everything that possibly needs to be built -fPIC or the
	# build will not rebuild what it needs to build.  We just delete all .o files, so this takes longer
	# since many of these are NOT shared.  But it works.
	cd ${BUILD_WASM}/Modules && find . -name "*.o" -type f -delete
	# Do the build, but with fPIC this time.  We also have to pass some *_LDFLAGS to keep
	# from using -lm, which isn't needed or supported by "zig wasm-ld" with the options we're using.
	# Parallel build is fine for this, unlike above.
	cd ${BUILD_WASM} && \
		make \
		CONFIGURE_LDFLAGS_NODIST="" \
		LINKFORSHARED="-shared" \
		MODULE__DECIMAL_LDFLAGS="Modules/_decimal/libmpdec/libmpdec.a" \
	 	MODULE_PYEXPAT_LDFLAGS="Modules/expat/libexpat.a" \
		MODULE__DATETIME_LDFLAGS="" \
		CC="zig-fPIC cc ${OPT}" \
		CXX="zig-fPIC c++ ${OPT}" \
		BLDSHARED="${BLDSHARED}" \
	# CRITICAL!  We have to make changes to build/lib.wasi-wasm32-3.11/_sysconfigdata__wasi_wasm32-wasi.py so it
	# matches the configuration we just used for building shared modules.  Otherwise, distutils
	# and setuptools, etc., will use the original options and things will be completely broken
	# due to lack of -fPIC.  This is annoying, but we don't want to build the core python executable
	# -fPIC, since that is slower and bigger and we don't need it.
	# This is what based on testing actually works:
	#      'zig cc -target wasm32-wasi' --> 'zig-fPIC cc'
	#      'zig c++ -target wasm32-wasi' --> 'zig-fPIC c++'
	#      'LDSHARED': '' --> 'LDSHARED': 'zig wasm-ld --experimental-pic -shared -s --compress-relocations'
	cd ${BUILD_WASM}/build/lib.wasi-wasm32-3.11/ \
		&& sed -i'.bak' "s/zig cc -target wasm32-wasi/zig-fPIC cc/g" _sysconfigdata__wasi_wasm32-wasi.py \
		&& sed -i'.bak' "s/zig c++ -target wasm32-wasi/zig-fPIC c++/g" _sysconfigdata__wasi_wasm32-wasi.py \
		&& sed -i'.bak' "s/'LDSHARED': ''/'LDSHARED': 'zig wasm-ld --experimental-pic -shared -s --compress-relocations'/g" _sysconfigdata__wasi_wasm32-wasi.py
	# Install as usual.
	cd ${BUILD_WASM} && make install
	# For mysterious reasons, test-tomllib isn't copied over.
	cp -rv ${BUILD_WASM}/Lib/test/test_tomllib ${DIST_WASM}/lib/python3.11/test/
	# Copy over our small zython library with functionality for our packages.
	cp ${SRC}/zython_importer.py ${DIST_WASM}/lib/python3.11/site-packages
	cp ${SRC}/zython_importer.py ${DIST_WASM}/lib/dist
	# Done!
	touch ${DIST_WASM}/.built-cpython

.PHONY:
wasm-cpython: ${DIST_WASM}/.built-cpython

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
# To try this, replace "		&& python-native ./Tools/wasm/wasm_assets.py " below by
# && zython-debug ./Tools/wasm/wasm_assets.py \

${DIST_WASM}/.built-data: ${DIST_WASM}/.built-cpython
	# Build wasm asset bundle (the pyc files, etc.).
	cd ${BUILD_WASM} \
		&& mkdir -p usr/local/lib/python3.11/lib-dynload/  \
		&& python-native ./Tools/wasm/wasm_assets.py \
		&& rm -rf ${DIST_WASM}/lib/dist \
		&& mv usr/local/lib ${DIST_WASM}/lib/dist
	# Add termcap for xterm to our zip asset bundle, so readline actually works:
	cp ${CWD}/src/termcap ${DIST_WASM}/lib/dist/termcap && cd ${DIST_WASM}/lib/dist/ && zip -u python311.zip termcap
	# **TODO:** It is very silly for these to be in the same zip file, obviously, because that means they have to be downloaded,
	# so we should just put them in the main binary.  We'll change that when things are working.
	mkdir -p ${DIST_WASM}/lib/dist/lib-dynload/
	cp -v ${DIST_WASM}/lib/python3.11/lib-dynload/*.so ${DIST_WASM}/lib/dist/lib-dynload/
	# Unfortunately, wasm-strip removes the critical custom section that makes the so file useful, since NotImplementedError
	#      https://reviews.llvm.org/D73820
	#find ${DIST_WASM}/lib/dist/lib-dynload -type f -name "*.so" | xargs -n1 ${CWD}/node_modules/.bin/wasm-strip
	# Instead, we use the -s option to wasm-ld above.
	# Also mv zip to a more meaningful name.
	cd ${DIST_WASM}/lib/dist/ \
		&& zip -u python311.zip lib-dynload/* \
		&& cp ../python3.11/site-packages/zython_importer.py . \
		&& zip -u python311.zip zython_importer.py \
		&& mv python311.zip python-stdlib.zip

	# Next make the MINIMAL python0.zip, which is all that's needed to start python (e.g., for a jupyter kernel or to back
	# computations, but not a REPL). We also make a version with the readline so, so you can start a terminal, before
	# more data needs to be loaded.
	cd ${DIST_WASM}/lib/dist/ \
		&& mkdir tmp && cd tmp && unzip ../python-stdlib.zip && cp ../termcap .\
		&& zip ../python-minimal.zip ${MINIMAL_FILES} \
		&& zip ../python-readline.zip ${MINIMAL_FILES} ${MINIMAL_READLINE} \
		&& cd .. && rm -rf tmp

	touch ${DIST_WASM}/.built-data


${DIST_WASM}/.built: ${DIST_WASM}/.built-data
	touch ${DIST_WASM}/.built



# Use "make run-wasm" to run our WASM python at the command line.
# You can also just run `zython` in the top level bin/ directory.
.PHONY: run-zython
run-zython: wasm python-wasm
	${ZYTHON}


###########
# Installing pip and setuptools
# We can only do this after ../packages/python-wasm is built, which depends on dylink
# (which depends on cpython) and many other things.  So this target is invoked later.
# NOTE: If you do "make clean-wasm", then "make", be sure to also do "make pip".
###########
${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built: ${DIST_WASM}/.built
	cd ${PACKAGES}/python-wasm && make
	rm -rf ${DIST_WASM}/lib/python*/site-packages/*pip* ${DIST_WASM}/lib/python*/site-packages/*setuptools*
	zython-debug -m ensurepip
	# We apply one patch to support building C++ extensions.  Without this, the numpy
	# build fails pretty quickly. This is needed due to our hacky approach to -fPIC.
	cd ${DIST_WASM} && cat ${CWD}/src/patches/10-setuptools-c++.patch | patch -p1
	touch ${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built

pip: ${DIST_WASM}/lib/python3.11/site-packages/setuptools/.built
.PHONY: pip


# Run the full official Python test suite on the wasm build.  We can't just do
# "make test" in build/wasm, since that only support wasmtime and emscripten.
# Also, we can't use zython to orchestrate this (yet), since the
# test suite runner uses threads.  However, you set line 543 to
#         self.ns.use_mp = 0
# of dist/wasm/lib/python3.11/test/libregrtest/main.py then it works, but of course
# with a single process, which is slow. So we stick with python-native.
RUN_TESTS =  _PYTHON_PROJECT_BASE=${BUILD_WASM} \
	_PYTHON_HOST_PLATFORM=wasi-wasm32 \
	PYTHONPATH=${DIST_WASM}/lib/python3.11 \
	_PYTHON_SYSCONFIGDATA_NAME=_sysconfigdata__wasi_wasm32-wasi \
	${DIST_NATIVE}/bin/python3 \
	./Tools/scripts/run_tests.py

# We use a restricted PATH for running tests.  On Linux I had a lot of trouble
# with some random binaries in random places causing hangs, and this provides
# a cleaner environment.
TEST_PATH=${BIN}:/bin:/usr/bin

test-all: wasm native
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS}
.PHONY: test-all


# I got this list using this on the output:
#     grep passed out | awk '{print $(NF - 1)}' | tr '\n' ' '
SUPPORTED_TEST_DESC = "the **supported-by-python-wasm** cpython test suites"
SUPPORTED_TESTS = test_sys test_platform test_atexit test_base64 test_builtin test_calendar test_capi test_cgitb test_code test_compile test_eof test_fstring test_graphlib test_gzip test_hash test_import test_inspect  test_module test_ntpath test_popen test_posixpath test_py_compile test_pydoc test_quopri test_readline test_script_helper test_source_encoding test_struct test_tabnanny test_tarfile test_trace test_unicodedata test_weakref test___all__ test___future__ test__locale test__opcode test__osx_support test_abc test_abstract_numbers test_aifc test_argparse test_array test_ast test_audioop test_augassign test_baseexception test_bdb test_bigaddrspace test_bigmem test_binascii test_binop test_bisect test_bool test_buffer test_bufio test_bz2 test_call test_cgi test_charmapcodec test_class test_cmath test_cmd test_code_module test_codeccallbacks test_codecencodings_cn test_codecencodings_hk test_codecencodings_iso2022 test_codecencodings_jp test_codecencodings_kr test_codecencodings_tw test_codecmaps_cn test_codecmaps_hk test_codecmaps_jp test_codecmaps_kr test_codecmaps_tw test_codeop test_collections test_colorsys test_compare test_complex test_configparser test_contains test_context test_contextlib test_copy test_copyreg test_cppext test_crashers test_crypt test_csv test_dataclasses test_datetime test_dbm test_dbm_dumb test_decimal test_decorators test_defaultdict test_deque test_descr test_descrtut test_dict test_dict_version test_dictcomps test_dictviews test_difflib test_dis test_doctest2 test_dynamic test_dynamicclassattribute test_eintr test_email test_ensurepip test_enum test_enumerate test_errno test_except_star test_exception_group test_exception_hierarchy test_exception_variations test_extcall test_file test_filecmp test_fileinput test_fileutils test_finalization test_float test_flufl test_fnmatch test_format test_fractions test_frame test_frozen test_funcattrs test_functools test_future test_future3 test_future4 test_future5 test_generator_stop test_genericalias test_genericclass test_genericpath test_genexps test_getargs2 test_getopt test_getpath test_gettext test_global test_grammar test_hashlib test_heapq test_hmac test_html test_htmlparser test_http_cookiejar test_http_cookies test_imghdr test_index test_int test_int_literal test_ipaddress test_isinstance test_iter test_iterlen test_itertools test_keyword test_keywordonlyarg  test_lib2to3 test_linecache test_list test_listcomps test_lltrace test_locale test_long test_longexp test_lzma test_mailcap test_math test_memoryio test_memoryview test_metaclass test_mimetypes test_minidom test_modulefinder test_multibytecodec test_named_expressions test_netrc  test_numeric_tower test_opcache test_opcodes test_operator test_optparse test_ordered_dict test_osx_env test_patma test_peepholer test_peg_generator test_pep646_syntax test_pickle test_picklebuffer test_pickletools test_pipes test_pkg test_pkgutil test_plistlib test_positional_only_arg test_pow test_pprint test_print test_property test_pulldom test_pyclbr test_pyexpat test_raise test_random test_range test_re test_reprlib test_richcmp test_rlcompleter test_sax test_sched test_scope test_secrets test_set test_setcomps test_shelve test_shlex test_slice test_sndhdr test_sort  test_statistics test_strftime test_string test_string_literals test_stringprep test_strptime test_strtod test_structmembers test_structseq test_subclassinit test_sunau test_sundry test_super test_symtable test_syntax test_textwrap test_threadsignals test_timeit  test_tokenize test_tomllib test_tuple test_type_annotations test_type_cache test_type_comments test_typechecks test_types test_ucn test_unary test_unicode_file test_unicode_file_functions test_unicode_identifiers test_univnewlines test_unpack test_unpack_ex test_unparse test_urlparse test_userdict test_userlist test_userstring test_utf8source test_uu test_uuid test_wave test_weakset test_with test_xdrlib test_xml_dom_minicompat test_xml_etree_c test_xxtestfuzz test_yield_from test_zipimport test_zlib test_zoneinfo test_cprofile test_pstats test_profile test_tempfile test_sys_setprofile

# This ensures that the python-wasm package is built, hence the zython program,
# and updated, i.e., the
# actual python.wasm wasm binary.  Without this, it can be easy to do
# something like "make clean && make && make test", and accidentally
# run the test suite on the *previous* binary, since "make clean && make"
# is really only updating libpython*.a:

python-wasm:
	cd ${PACKAGES}/python-wasm && make
.PHONY: python-wasm

test-pip: pip
	echo "Testing PIP"
	zython-debug -m pip |grep Usage
	echo "Success"
.PHONY: test-pip


test: wasm native python-wasm test-pip
	echo "Running ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS} -j4 --timeout=240 ${SUPPORTED_TESTS}
	echo "Ran ${SUPPORTED_TEST_DESC}"
.PHONY: test

PASSED_WITHOUT_SUBPROCESS_DESC = "These tests all passed without subprocess or socket support enabled, but fail with it."
PASSED_WITHOUT_SUBPROCESS = test_timeout test_stat test_robotparser test_nntplib test_largefile test_logging test_audit test_bytes test_c_locale_coercion test_cmd_line_script test_compileall test_coroutines test_exceptions test_gc test_json test_marshal test_runpy test_site  test_traceback test_unicode test_utf8_mode test_warnings

test-passed-without-subprocess: wasm native
	echo "Running ${PASSED_WITHOUT_SUBPROCESS_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS} --timeout=180 -j4 ${PASSED_WITHOUT_SUBPROCESS}
	echo "Ran ${PASSED_WITHOUT_SUBPROCESS_DESC}"


# One test fails here due to the fact that the PYTHONHOME is different in webworker mode (since the files are in the zip archive).
test-worker: wasm native
	echo "Running using webworker -- ${SUPPORTED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} PYTHONHOME=${DIST_WASM} _PYTHON_HOSTRUNNER=${ZYTHON} ${RUN_TESTS} -j4 --timeout=180 ${SUPPORTED_TESTS}
	echo "Ran using webworker -- ${SUPPORTED_TEST_DESC}"

# NOTES:
#  test_pydoc - sometimes randomly hangs, mainly on linux.
#
FAILED_TEST_DESC = "All **unsuppported** and known failing cpython test suites: this is less than 10% of the non-skipped cpython test suite.  We want to fix all of these."
FAILED_TESTS =   test_getpass test_codecs   test_distutils test_fileio test_generators test_glob test_imp test_importlib  test_io    test_openpty test_os test_pathlib   test_posix          test_shutil test_signal  test_sqlite3  test_support  test_sysconfig    test_time  test_tracemalloc test_typing   test_unittest  test_xml_etree test_zipapp test_zipfile


test-failed:  wasm native
	echo "Running ${FAILED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS} --timeout=180 -j4 ${FAILED_TESTS}
	echo "Ran ${FAILED_TEST_DESC}"


TEST=test_long
test-one:   wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS} --timeout=60 -v ${TEST}
.PHONY: test-one

test-one-worker: wasm native
	echo "Use 'make TEST=test_long test-one' to run a specific test, e.g., test_long in this case."
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON} ${RUN_TESTS} -j1 --timeout=60 -v ${TEST}
.PHONY: test-one


SKIPPED_TEST_DESC = "all **skipped** cpython test suites.  Extend what cpython wasm can do to include more of these."
SKIPPED_TESTS = test_asdl_parser test__xxsubinterpreters test_asyncgen test_asynchat test_asyncio test_asyncore test_check_c_globals test_clinic test_cmd_line test_concurrent_futures test_contextlib_async test_ctypes test_curses test_dbm_gnu test_dbm_ndbm test_devpoll test_doctest test_docxmlrpc test_dtrace test_embed test_epoll test_faulthandler test_fcntl test_file_eintr test_fork1 test_ftplib test_gdb test_grp test_httplib test_httpservers test_idle test_imaplib test_interpreters test_ioctl test_kqueue test_launcher test_mailbox test_mmap test_msilib test_multiprocessing_fork test_multiprocessing_forkserver test_multiprocessing_main_handling test_multiprocessing_spawn test_nis test_ossaudiodev test_pdb test_poll test_poplib test_pty test_pwd test_queue test_regrtest test_repl test_resource test_select test_selectors test_smtpd test_smtplib test_smtpnet test_socket test_socketserver test_spwd test_ssl test_stable_abi_ctypes test_startfile test_subprocess test_sys_settrace test_syslog test_tcl test_telnetlib test_thread test_threadedtempfile test_threading test_threading_local test_tix test_tk test_tools test_ttk_guionly test_ttk_textonly test_turtle test_urllib test_urllib2 test_urllib2_localnet test_urllib2net test_urllib_response test_urllibnet test_venv test_wait3 test_wait4 test_webbrowser test_winconsoleio test_winreg test_winsound test_wsgiref test_xmlrpc test_xmlrpc_net test_xxlimited test_zipfile64 test_zipimport_support

test-skipped:  wasm native
	echo "Running ${SKIPPED_TEST_DESC}"
	cd ${BUILD_WASM} && PATH=${TEST_PATH} _PYTHON_HOSTRUNNER=${ZYTHON_DEBUG} ${RUN_TESTS} --timeout=60 ${SKIPPED_TESTS}
	echo "Ran ${SKIPPED_TEST_DESC}"
