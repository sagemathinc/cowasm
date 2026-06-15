import bz2
import ctypes
import decimal
import hashlib
import importlib
import json
import lzma
import sqlite3
import sysconfig
import unicodedata
import unittest
from xml.parsers import expat
import zlib


class WasiSdkExtensionImportTests(unittest.TestCase):
    def test_json_extension_imports_from_lib_dynload(self):
        import _json

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _json.__file__.endswith(f"/lib-dynload/_json{suffix}"),
            _json.__file__,
        )

    def test_json_uses_extension_accelerators(self):
        import _json

        self.assertEqual(json.loads('{"a": [1, 2, 3]}'), {"a": [1, 2, 3]})
        self.assertEqual(json.dumps({"b": 5}, sort_keys=True), '{"b": 5}')
        self.assertIs(json.scanner.c_make_scanner, _json.make_scanner)
        self.assertIs(json.encoder.c_make_encoder, _json.make_encoder)

    def test_pyexpat_extension_imports_from_lib_dynload(self):
        import pyexpat

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            pyexpat.__file__.endswith(f"/lib-dynload/pyexpat{suffix}"),
            pyexpat.__file__,
        )

    def test_pyexpat_parser_callbacks(self):
        events = []
        parser = expat.ParserCreate()
        parser.StartElementHandler = lambda name, attrs: events.append(
            ("start", name, sorted(attrs.items()))
        )
        parser.EndElementHandler = lambda name: events.append(("end", name))
        parser.CharacterDataHandler = lambda data: events.append(("data", data))

        parser.Parse('<root a="1"><child>cowasm</child></root>', True)

        self.assertEqual(
            events,
            [
                ("start", "root", [("a", "1")]),
                ("start", "child", []),
                ("data", "cowasm"),
                ("end", "child"),
                ("end", "root"),
            ],
        )

    def test_zlib_extension_imports_from_lib_dynload(self):
        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            zlib.__file__.endswith(f"/lib-dynload/zlib{suffix}"),
            zlib.__file__,
        )

    def test_zlib_extension_roundtrip(self):
        payload = b"cowasm-zlib-extension" * 4
        compressed = zlib.compress(payload)
        self.assertLess(len(compressed), len(payload))
        self.assertEqual(zlib.decompress(compressed), payload)
        self.assertEqual(zlib.crc32(b"cowasm"), 2888577577)

    def test_bz2_extension_imports_from_lib_dynload(self):
        import _bz2

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _bz2.__file__.endswith(f"/lib-dynload/_bz2{suffix}"),
            _bz2.__file__,
        )

    def test_bz2_extension_roundtrip(self):
        payload = b"cowasm-bz2-extension" * 4
        compressed = bz2.compress(payload)
        self.assertLess(len(compressed), len(payload))
        self.assertEqual(bz2.decompress(compressed), payload)

    def test_lzma_extension_imports_from_lib_dynload(self):
        import _lzma

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _lzma.__file__.endswith(f"/lib-dynload/_lzma{suffix}"),
            _lzma.__file__,
        )

    def test_lzma_extension_roundtrip(self):
        payload = b"cowasm-lzma-extension" * 64
        compressed = lzma.compress(payload)
        self.assertLess(len(compressed), len(payload))
        self.assertEqual(lzma.decompress(compressed), payload)

    def test_sqlite3_extension_imports_from_lib_dynload(self):
        import _sqlite3

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _sqlite3.__file__.endswith(f"/lib-dynload/_sqlite3{suffix}"),
            _sqlite3.__file__,
        )

    def test_sqlite3_in_memory_query(self):
        with sqlite3.connect(":memory:") as db:
            db.execute("create table values_table (value integer)")
            db.executemany(
                "insert into values_table values (?)",
                [(389,), (5077,)],
            )
            result = db.execute("select value from values_table order by value").fetchall()

        self.assertEqual(result, [(389,), (5077,)])

    def test_unicodedata_extension_imports_from_lib_dynload(self):
        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            unicodedata.__file__.endswith(f"/lib-dynload/unicodedata{suffix}"),
            unicodedata.__file__,
        )

    def test_unicodedata_normalization(self):
        self.assertEqual(unicodedata.normalize("NFC", "e\u0301"), "\u00e9")
        self.assertEqual(unicodedata.name("\u03c0"), "GREEK SMALL LETTER PI")

    def test_decimal_extension_imports_from_lib_dynload(self):
        import _decimal

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _decimal.__file__.endswith(f"/lib-dynload/_decimal{suffix}"),
            _decimal.__file__,
        )

    def test_decimal_uses_c_extension(self):
        import _decimal

        self.assertIs(decimal.Decimal, _decimal.Decimal)
        self.assertIs(decimal.getcontext().__class__, _decimal.Context)
        self.assertEqual(decimal.Decimal.__module__, "decimal")
        self.assertEqual(decimal.getcontext().__class__.__module__, "decimal")
        value = decimal.Decimal("1.2345") * decimal.Decimal("1000")
        self.assertEqual(value, decimal.Decimal("1234.5000"))
        self.assertEqual(value.quantize(decimal.Decimal("0.01")), decimal.Decimal("1234.50"))

    def test_hashlib_extension_imports_from_lib_dynload(self):
        import _hashlib

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _hashlib.__file__.endswith(f"/lib-dynload/_hashlib{suffix}"),
            _hashlib.__file__,
        )

    def test_hashlib_uses_openssl_extension(self):
        import _hashlib

        self.assertIn("sha256", _hashlib.openssl_md_meth_names)
        self.assertEqual(hashlib.new("sha256").__class__.__module__, "_hashlib")
        self.assertEqual(
            hashlib.sha256(b"cowasm").hexdigest(),
            "1b836ad18cd01022df2e7ac15471d70ec26fd8dd723d3992344a0c42a8561002",
        )
        self.assertEqual(
            hashlib.new("sha3_256", b"cowasm").hexdigest(),
            "368c62d92cf4f3a3d7480c8773ecf641347a2bbc9a38c5ed589fc853d084454b",
        )

    def test_ctypes_extension_imports_from_lib_dynload(self):
        import _ctypes

        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        self.assertTrue(
            _ctypes.__file__.endswith(f"/lib-dynload/_ctypes{suffix}"),
            _ctypes.__file__,
        )

    def test_ctypes_basic_layout_and_pointer_access(self):
        class Pair(ctypes.Structure):
            _fields_ = [
                ("left", ctypes.c_int),
                ("right", ctypes.c_int),
            ]

        pair = Pair(389, 5077)
        self.assertEqual((pair.left, pair.right), (389, 5077))
        self.assertEqual(ctypes.sizeof(Pair), ctypes.sizeof(ctypes.c_int) * 2)

        value = ctypes.c_int(389)
        pointer = ctypes.pointer(value)
        self.assertEqual(pointer.contents.value, 389)
        pointer.contents.value = 5077
        self.assertEqual(value.value, 5077)

        array = (ctypes.c_int * 3)(1, 2, 3)
        self.assertEqual(list(array), [1, 2, 3])

    def test_cjk_codec_extensions_import_from_lib_dynload(self):
        suffix = sysconfig.get_config_var("EXT_SUFFIX")
        for name in (
            "_codecs_cn",
            "_codecs_hk",
            "_codecs_iso2022",
            "_codecs_jp",
            "_codecs_kr",
            "_codecs_tw",
        ):
            with self.subTest(name=name):
                module = importlib.import_module(name)
                self.assertTrue(
                    module.__file__.endswith(f"/lib-dynload/{name}{suffix}"),
                    module.__file__,
                )

    def test_cjk_codecs_are_registered(self):
        for encoding in ("gb18030", "big5", "cp932", "euc_kr", "shift_jis"):
            with self.subTest(encoding=encoding):
                encoded = "cowasm".encode(encoding)
                self.assertEqual(encoded.decode(encoding), "cowasm")


if __name__ == "__main__":
    unittest.main(verbosity=2)
