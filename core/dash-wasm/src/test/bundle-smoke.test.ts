import { readFileSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";

const fsZipPath = join(__dirname, "..", "fs.zip");
const dashWasm = join(__dirname, "..", "..", "bin", "dash-wasm");

function fsZipContents(): string {
  return readFileSync(fsZipPath).toString("latin1");
}

function runDash(command: string): string {
  return execFileSync(dashWasm, ["-c", command], {
    encoding: "utf8",
  });
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

test("bundled shell can execute coreutils commands such as factor", () => {
  const output = runDash("factor 2023");
  expect(output.trim()).toBe("2023: 7 17 17");
});

test("bundled shell can execute Python from /usr/bin/python", () => {
  const output = runDash("python -c 'print(6*7)'");
  expect(output.trim()).toBe("42");
});

test("bundled shell can execute sqlite3", () => {
  const output = runDash("sqlite3 --version");
  expect(output).toMatch(/^3\./);
});

test("bundled shell can execute tar", () => {
  const output = runDash(
    "python -c 'import os; os.makedirs(\"/tmp/cowasm-tar\", exist_ok=True); open(\"/tmp/cowasm-tar/a.txt\", \"w\").write(\"alpha\\n\")' && " +
      "tar -cf /tmp/cowasm-tar/a.tar -C /tmp/cowasm-tar a.txt && " +
      "tar -tf /tmp/cowasm-tar/a.tar"
  );
  expect(output.trim()).toBe("a.txt");
});

test("bundled shell can execute basic file commands", () => {
  expect(runDash("mkdir -p /tmp/cowasm-tools && ls /tmp")).toContain(
    "cowasm-tools"
  );

  const setup =
    "mkdir -p /tmp/cowasm-tools && " +
    "python -c 'open(\"/tmp/cowasm-tools/input.txt\", \"w\").write(\"b\\na\\n\")'";
  expect(runDash(`${setup} && cat /tmp/cowasm-tools/input.txt`)).toBe("b\na\n");
  expect(runDash(`${setup} && sort /tmp/cowasm-tools/input.txt`)).toBe("a\nb\n");
  expect(runDash(`${setup} && grep a /tmp/cowasm-tools/input.txt`)).toBe("a\n");
  expect(runDash(`${setup} && wc -l /tmp/cowasm-tools/input.txt`)).toContain(
    "2 /tmp/cowasm-tools/input.txt"
  );
  const removeAndList =
    `${setup} && rm /tmp/cowasm-tools/input.txt && ls /tmp/cowasm-tools`;
  expect(runDash(removeAndList)).not.toContain("input.txt");
});

test("bundled shell can execute less in non-interactive version mode", () => {
  expect(runDash("less --version")).toContain("less 608");
});

test.todo("bundled cp preserves file contents");
test.todo("bundled shell supports redirection without hanging");
test.todo("bundled shell supports pipes without trapping");
test.todo("bundled shell supports command substitution without trapping");
