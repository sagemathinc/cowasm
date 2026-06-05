import os
import shutil
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

    def test_subprocess_preserves_cwd_and_env(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["COWASM_CONTRACT_ENV"] = "runtime-env-ok"
            result = self.run_child(
                (
                    "import os; "
                    "print(os.getcwd()); "
                    "print(os.environ['COWASM_CONTRACT_ENV'])"
                ),
                cwd=tmp,
                env=env,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout.splitlines(), [tmp, "runtime-env-ok"])

    def test_subprocess_redirects_regular_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            stdin_path = Path(tmp) / "stdin.txt"
            stdout_path = Path(tmp) / "stdout.txt"
            stderr_path = Path(tmp) / "stderr.txt"
            stdin_path.write_text("file-stdin\n")

            with (
                stdin_path.open() as stdin,
                stdout_path.open("w") as stdout,
                stderr_path.open("w") as stderr,
            ):
                result = self.run_child(
                    (
                        "import sys; "
                        "sys.stdout.write(sys.stdin.read().upper()); "
                        "sys.stderr.write('file-stderr\\n')"
                    ),
                    stdin=stdin,
                    stdout=stdout,
                    stderr=stderr,
                )

            self.assertEqual(result.returncode, 0)
            self.assertEqual(stdout_path.read_text(), "FILE-STDIN\n")
            self.assertEqual(stderr_path.read_text(), "file-stderr\n")

    def test_subprocess_pass_fds_inherits_requested_fd(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "fd-output.txt"
            fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            try:
                env = os.environ.copy()
                env["COWASM_CONTRACT_FD"] = str(fd)
                result = self.run_child(
                    (
                        "import os; "
                        "fd = int(os.environ['COWASM_CONTRACT_FD']); "
                        "os.write(fd, b'pass-fds-ok')"
                    ),
                    env=env,
                    pass_fds=(fd,),
                    capture_output=True,
                )
            finally:
                os.close(fd)

            self.assertEqual(result.returncode, 0)
            self.assertEqual(output.read_text(), "pass-fds-ok")

    def test_subprocess_close_fds_does_not_leak_fd(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "fd-output.txt"
            fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            try:
                os.set_inheritable(fd, True)
                env = os.environ.copy()
                env["COWASM_CONTRACT_FD"] = str(fd)
                result = self.run_child(
                    (
                        "import os, sys; "
                        "fd = int(os.environ['COWASM_CONTRACT_FD']); "
                        "\ntry:\n"
                        "    os.write(fd, b'leaked-fd')\n"
                        "except OSError:\n"
                        "    raise SystemExit(42)\n"
                        "raise SystemExit(0)"
                    ),
                    env=env,
                    close_fds=True,
                    capture_output=True,
                )
            finally:
                os.close(fd)

            self.assertEqual(result.returncode, 42)
            self.assertEqual(output.read_text(), "")

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

    def test_filesystem_create_read_write_delete(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = root / "nested" / "contract.txt"
            path.parent.mkdir()
            path.write_text("created")
            path.write_text(path.read_text() + "-updated")
            self.assertEqual(path.read_text(), "created-updated")

            stat = path.stat()
            self.assertTrue(stat.st_mode & 0o600)
            self.assertEqual(stat.st_size, len("created-updated"))

            path.unlink()
            self.assertFalse(path.exists())

    def test_filesystem_recursive_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / "src"
            src.mkdir()
            (src / "a.txt").write_text("a")
            (src / "sub").mkdir()
            (src / "sub" / "b.txt").write_text("b")

            dest = root / "dest"
            shutil.copytree(src, dest)

            self.assertEqual((dest / "a.txt").read_text(), "a")
            self.assertEqual((dest / "sub" / "b.txt").read_text(), "b")

            shutil.rmtree(dest)
            self.assertFalse(dest.exists())

    def test_filesystem_symlink_if_supported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "target.txt"
            link = root / "link.txt"
            target.write_text("symlink-target")

            try:
                os.symlink(target, link)
            except (AttributeError, NotImplementedError, OSError) as err:
                self.skipTest(f"symlink unsupported in this runtime: {err}")

            self.assertTrue(link.is_symlink())
            self.assertEqual(link.read_text(), "symlink-target")


if __name__ == "__main__":
    unittest.main(verbosity=2)
