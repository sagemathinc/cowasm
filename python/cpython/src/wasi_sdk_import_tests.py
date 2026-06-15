import importlib
import sys
import sysconfig
import unittest


class WasiSdkImportTests(unittest.TestCase):
    def test_site_installs_cowasm_importer(self):
        import cowasm_importer
        import site

        self.assertIsNotNone(site)
        self.assertTrue(
            any(
                finder.__class__.__module__ == cowasm_importer.__name__
                for finder in sys.meta_path
            )
        )

    def test_representative_pure_stdlib_imports(self):
        modules = [
            "argparse",
            "base64",
            "configparser",
            "dataclasses",
            "email.parser",
            "fractions",
            "hashlib",
            "http.client",
            "json",
            "pathlib",
            "pickle",
            "shutil",
            "statistics",
            "subprocess",
            "tempfile",
            "textwrap",
            "unittest",
            "zipfile",
        ]
        for name in modules:
            with self.subTest(name=name):
                self.assertEqual(importlib.import_module(name).__name__, name)

    def test_sysconfig_matches_cowasm_wasi_sdk_extension_shape(self):
        self.assertEqual(sysconfig.get_config_var("SOABI"), "cpython-314-wasm32-wasi")
        self.assertEqual(
            sysconfig.get_config_var("EXT_SUFFIX"),
            ".cpython-314-wasm32-wasi.so",
        )
        self.assertIn("cowasm-cc", sysconfig.get_config_var("LDSHARED"))
        self.assertTrue(sysconfig.get_paths()["include"].endswith("/include/python3.14"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
