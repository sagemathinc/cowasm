import { readFileSync } from "fs";
import { join } from "path";

test("filesystem bundle contains expected terminal commands", () => {
  const fsZip = readFileSync(join(__dirname, "..", "fs.zip")).toString("latin1");
  for (const path of [
    "bin/sh",
    "bin/factor",
    "bin/grep",
    "bin/less",
    "bin/python",
    "bin/sqlite3",
    "bin/tar",
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
