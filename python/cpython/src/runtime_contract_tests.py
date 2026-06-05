import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class RuntimeContractTests(unittest.TestCase):
    def run_child(self, code, **kwargs):
        return subprocess.run(
            [sys.executable, "-c", code],
            text=True,
            **kwargs,
        )

    def test_subprocess_captures_stdout_and_stderr(self):
        result = self.run_child(
            "import sys; print('contract-out'); print('contract-err', file=sys.stderr)",
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "contract-out\n")
        self.assertEqual(result.stderr, "contract-err\n")

    def test_subprocess_pipe_stdin(self):
        result = self.run_child(
            "import sys; sys.stdout.write(sys.stdin.read().upper())",
            input="cowasm\n",
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "COWASM\n")

    def test_subprocess_nonzero_exit_status(self):
        result = self.run_child("raise SystemExit(17)", capture_output=True)
        self.assertEqual(result.returncode, 17)

    def test_spawnl_wait_writes_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "spawn-output.txt"
            code = (
                "from pathlib import Path; "
                f"Path({str(output)!r}).write_text('spawn-ok')"
            )
            status = os.spawnl(
                os.P_WAIT,
                sys.executable,
                sys.executable,
                "-c",
                code,
            )
            self.assertEqual(status, 0)
            self.assertEqual(output.read_text(), "spawn-ok")

    def test_spawnl_nonzero_exit_status(self):
        status = os.spawnl(
            os.P_WAIT,
            sys.executable,
            sys.executable,
            "-c",
            "raise SystemExit(23)",
        )
        self.assertEqual(status, 23)


if __name__ == "__main__":
    unittest.main(verbosity=2)
