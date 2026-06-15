import json
import sysconfig
import unittest


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


if __name__ == "__main__":
    unittest.main(verbosity=2)
