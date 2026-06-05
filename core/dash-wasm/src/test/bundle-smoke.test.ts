import { readFileSync, statSync } from "fs";
import { join } from "path";

const fsZipPath = join(__dirname, "..", "fs.zip");

function fsZipContents(): string {
  return readFileSync(fsZipPath).toString("latin1");
}

test("filesystem bundle size stays in the expected range", () => {
  const size = statSync(fsZipPath).size;
  expect(size).toBeGreaterThan(10 * 1024 * 1024);
  expect(size).toBeLessThan(16 * 1024 * 1024);
});

test("filesystem bundle contains expected terminal commands", () => {
  const fsZip = fsZipContents();
  for (const path of [
    "bin/sh",
    "bin/cat",
    "bin/cp",
    "bin/factor",
    "bin/grep",
    "bin/less",
    "bin/ls",
    "bin/mkdir",
    "bin/python",
    "bin/rm",
    "bin/sort",
    "bin/sqlite3",
    "bin/tar",
    "bin/wc",
    "bin/xz",
    "lib/python3.11/numpy.tar.xz",
  ]) {
    expect(fsZip).toContain(path);
  }
});

test.todo("bundled shell can execute coreutils commands such as factor");
test.todo("bundled shell can execute Python from /usr/bin/python");
test.todo("bundled shell can execute sqlite3");
test.todo("bundled shell can execute tar");
test.todo("bundled shell supports redirection without hanging");
test.todo("bundled shell supports pipes without trapping");
test.todo("bundled shell supports command substitution without trapping");
