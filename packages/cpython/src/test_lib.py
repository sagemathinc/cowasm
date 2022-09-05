"""
This is a little python script to run (some of) Python's test suite anywhere you can get a Python shell.
In particular, it will be useful in the browser.  It also at least computes timings, which the official
Python test runner doesn't do at all.

Obviously, this must take longer than the official test running, since it isn't run in parallel.
"""

import importlib
import test
import time
import unittest

# These aren't exactly the same as listed in our Makefile coming from the official test suite.
# E.g., test_tomllib isn't copied over to dist by the python install for some reason so it simply
# isn't available to test yet.


SUPPORTED_TESTS = "test_inspect test_pydoc test_platform test_posixpath test_pkgutil test_py_compile test_compileall test_compile test_richcmp test_plistlib test_runpy test_readline test_lzma test_capi test_userlist test_userdict  test_gzip test_exceptions test_numeric_tower test_unicode_identifiers test_typechecks test___future__ test_buffer test_getpath test_class test_sundry test_property test_datetime test_ordered_dict test_popen test_string_literals test_struct test_type_cache test_univnewlines test_unary test_gettext test_frame test_nntplib test_bdb test_email test_timeout test_index test_set test_int_literal test_getpass test_codecmaps_tw test_genericpath test_defaultdict test_iterlen test_cmd_line_script test_float test_exception_hierarchy test_codecmaps_cn test_type_annotations test_dict_version test_pyclbr test_abstract_numbers test_dataclasses test_xdrlib test_getopt test_keyword test_configparser test_mailcap test_cmd test_codecmaps_hk test_utf8_mode test_binascii test_wave test_int test_http_cookiejar test_site test_subclassinit test_bigmem test_gc test_zlib test_cgitb test_dynamic test_dis test_future test_future3 test_list test_picklebuffer test_marshal test_random test_deque test_osx_env test_cmath test_crypt test_sys test_string test_context test_doctest2 test_ucn test_urlparse test_warnings test_exception_group test_positional_only_arg test_functools test_long test_pep646_syntax test_codeop test_contains test_zipimport test_slice test_codecencodings_cn test_calendar test_syntax test_weakref test_fractions test_finalization test_tokenize test_bigaddrspace test_errno test_fnmatch test_codecencodings_hk test_sched test_trace test_codecmaps_jp test_operator test_bytes test_bufio test_iter test_unparse test_array test_sax test_strptime test_multibytecodec test_netrc test_funcattrs test_print test_with test_binop test_pickle test_http_cookies test_mimetypes test_hashlib test_patma test_cppext test_peg_generator test_named_expressions test_builtin test_contextlib test_xml_dom_minicompat test_pow test_codecencodings_kr test_decorators test__osx_support test_unpack test_difflib test_unpack_ex test_eof test_colorsys test_utf8source test_unicodedata test_secrets test_ipaddress test_htmlparser test_memoryview test_textwrap test_cgi test_copyreg test_bool test_weakset test_atexit test_html test_bisect test_code_module test_enumerate test_fileutils test_type_comments test_codeccallbacks test_genericclass test_copy test_codecencodings_jp test_super test_opcodes test_pulldom test_itertools test_file test___all__ test_future5 test_minidom test_codecencodings_tw test__locale test_stringprep test_dictcomps test_unicode test_dict test_codecmaps_kr test_robotparser test_sndhdr test_xxtestfuzz test_structmembers test_strtod test_re test_pprint test_keywordonlyarg test_collections test_types test_range test_imghdr test_ast test_metaclass test_pickletools test_math test_format test_isinstance test_tuple test_statistics test_hmac test_yield_from test_aifc test_uu test_symtable test_fstring test_exception_variations test_except_star test_shlex test_csv test_descrtut test_descr test_userstring test_crashers test_sort test_setcomps test_eintr test_graphlib test_ntpath test_augassign test_frozen test_genericalias test__opcode test_enum test_coroutines test_getargs2 test_memoryio test_extcall test_xml_etree_c test_largefile test_opcache test_compare test_pyexpat test_json test_locale test_strftime test_argparse test_baseexception test_codecencodings_iso2022 test_decimal test_grammar test_dynamicclassattribute test_generator_stop test_complex test_c_locale_coercion test_listcomps test_linecache test_abc test_optparse test_global test_timeit test_sunau test_lltrace test_pkg test_module test_structseq test_threadsignals test_genexps test_charmapcodec test_flufl test_traceback test_audioop test_hash test_quopri test_scope test_reprlib test_dictviews test_audit test_script_helper test_code test_raise test_call test_rlcompleter test_peepholer test_heapq test_future4 test_import test_longexp test_base64 test_modulefinder test_ensurepip test_stat test_zoneinfo test_logging test_source_encoding test_filecmp"

t0 = time.time()
passed = []
failed = []


def test_module(name):
    t = time.time()
    try:
        mod = importlib.import_module(f"test.{name}")
        unittest.main(mod, exit=False, verbosity=1)
        passed.append(name)
        print(f"{name} passed in {time.time()-t} seconds")
    except err as Exception:
        failed.append(name)
        print(err)
        print(f"{name} FAILED in {time.time()-t} seconds")


v = SUPPORTED_TESTS.split()
n = 1
for name in v:
    print(f"{n}/{len(v)}  ({round(time.time()-t0)} seconds): Testing {name}")
    test_module(name)
    n += 1

print("\n" * 3)
print("passed: ", ' '.join(sorted(passed)))
if len(failed) == 0:
    print("Success! All tests passed!")
else:
    print("FAILED: ", ' '.join(sorted(failed)))
