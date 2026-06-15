import json
import sysconfig
import unittest
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
