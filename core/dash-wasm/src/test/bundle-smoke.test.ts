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
  expect(size).toBeGreaterThan(20 * 1024 * 1024);
  expect(size).toBeLessThan(32 * 1024 * 1024);
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
    "bin/mv",
    "bin/python",
    "bin/rm",
    "bin/sort",
    "bin/sqlite3",
    "bin/tar",
    "bin/vi",
    "bin/viz",
    "bin/wc",
    "bin/xz",
    "lib/python3.14/cycler.tar.xz",
    "lib/python3.14/dateutil.tar.xz",
    "lib/python3.14/fontTools.tar.xz",
    "lib/python3.14/kiwisolver.tar.xz",
    "lib/python3.14/matplotlib.tar.xz",
    "lib/python3.14/numpy.tar.xz",
    "lib/python3.14/packaging.tar.xz",
    "lib/python3.14/pyparsing.tar.xz",
    "lib/python3.14/pytz.tar.xz",
    "lib/python3.14/six.tar.xz",
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

test("bundled shell can import matplotlib and construct a plot", () => {
  const output = runDash(
    "python -c 'import matplotlib; matplotlib.use(\"Agg\"); " +
      "import matplotlib.pyplot as plt; print(matplotlib.__version__); " +
      "plt.plot([1, 2, 3], [1, 4, 9]); print(\"plot ok\")'"
  );
  expect(output).toContain("3.6.2\n");
  expect(output).toContain("plot ok\n");
});

test("bundled shell can save matplotlib PNG output", () => {
  const output = runDash(
    "rm -f /tmp/cowasm-plot.png && " +
      "python -c 'import matplotlib; matplotlib.use(\"Agg\"); " +
      "import matplotlib.pyplot as plt; " +
      "plt.plot([1, 2, 3], [1, 4, 9]); " +
      "plt.savefig(\"/tmp/cowasm-plot.png\")' && " +
      "test -s /tmp/cowasm-plot.png && " +
      "python -c 'print(open(\"/tmp/cowasm-plot.png\", \"rb\").read(8) " +
      "== b\"\\x89PNG\\r\\n\\x1a\\n\")'"
  );
  expect(output.trim()).toBe("True");
});

test("bundled shell can import matplotlib in successive Python processes", () => {
  const output = runDash(
    "python -c 'import matplotlib; print(\"first\")' && " +
      "python -c 'import matplotlib; print(\"second\")'"
  );
  expect(output).toBe("first\nsecond\n");
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
  const copyAndCat =
    `${setup} && ` +
    "cp /tmp/cowasm-tools/input.txt /tmp/cowasm-tools/copy.txt && " +
    "cat /tmp/cowasm-tools/copy.txt";
  expect(runDash(copyAndCat)).toBe("b\na\n");
  const moveAndCat =
    `${setup} && ` +
    "mv /tmp/cowasm-tools/input.txt /tmp/cowasm-tools/moved.txt && " +
    "cat /tmp/cowasm-tools/moved.txt && " +
    "test ! -e /tmp/cowasm-tools/input.txt";
  expect(runDash(moveAndCat)).toBe("b\na\n");
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

test("bundled shell provides vi as a viz alias", () => {
  const viPath = runDash("command -v vi").trim();
  expect(viPath).toMatch(/\/bin\/vi$/);
  expect(runDash(`python -c 'import os; print(os.path.getsize("${viPath}") > 100000)'`)).toBe(
    "True\n"
  );
});

test("bundled shell supports file redirection", () => {
  expect(
    runDash(
      "mkdir -p /tmp/cowasm-redir && " +
        "echo alpha > /tmp/cowasm-redir/output.txt && " +
        "cat /tmp/cowasm-redir/output.txt"
    )
  ).toBe("alpha\n");

  const setup =
    "mkdir -p /tmp/cowasm-redir && " +
    "python -c 'open(\"/tmp/cowasm-redir/input.txt\", \"w\").write(\"beta\\n\")'";
  expect(runDash(`${setup} && cat < /tmp/cowasm-redir/input.txt`)).toBe(
    "beta\n"
  );
});

test("bundled shell supports pipes without trapping", () => {
  expect(runDash("echo gamma | cat")).toBe("gamma\n");
  expect(runDash("printf 'b\\na\\n' | sort")).toBe("a\nb\n");
  expect(runDash("python -c 'print(\"delta\")' | grep delta")).toBe("delta\n");
});

test.todo("bundled shell supports command substitution without trapping");
