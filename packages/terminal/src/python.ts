/*
import python from "python-wasm";

// See https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
const RED = "\x1b[0;31m";
const BLUE = "\x1b[0;34m";
const NC = "\x1b[0m";

let int32: any = undefined;
self.onmessage = ({ data: { init, input } }) => {
  if (init != null) {
    int32 = new Int32Array(init);
  }
  if (input != null) {
    // console.log("got ", input);
    if (input.startsWith("time.sleep")) {
      // This illustrates how to do a blocking synchronous sleep in Javascript, controlled
      // by the main thread.  Of course, ultimately we'll implement this as part of the
      // wasi package, so that the actual time.sleep in Python works.
      // Note that in pyodide, sleep silently fails: https://github.com/pyodide/pyodide/issues/2354
      // and they don't have a path to solve this problem, since they are not allowing web workers YET
      // as explained here: https://github.com/pyodide/pyodide/issues/237
      // For comparison, time.sleep appears to work in https://github.com/ethanhs/python-wasm, at
      // least it seems to when using the repl demo: https://repl.ethanhs.me/, but it actually makes
      // the cpu go to 100%, so is clearly wrong.
      const i = input.indexOf("(");
      const j = input.indexOf(")");
      // this will cause thread sync pause when it is received and processed.
      self.postMessage({ sleep: 1000 * parseInt(input.slice(i + 1, j)) });
      // but we have to wait a moment for that to happen:
      while (int32[0] != 1) {}
      // now the lock is set, and we wait for it to get unset:
      Atomics.wait(int32, 0, 1);
      self.postMessage({ prompt: true });
      return;
    }
    python.exec(input);
    const fs: any = python.wasm.fs; // TODO: something wrong with FileSystem type!
    const output: { stdout?: string; stderr?: string } = {};
    for (const stream of ["stderr", "stdout"]) {
      let output = fs.readFileSync("/dev/" + stream).toString();
      if (output) {
        if (stream == "stderr") {
          output = RED + output + NC;
        }
        self.postMessage({ output: output + "\n" });
        fs.writeFileSync("/dev/" + stream, "");
      }
    }
    self.postMessage({ prompt: true });
  }
};

async function main() {
  self.postMessage({ output: "Loading Python... " });
  await python.init();
  self.postMessage({
    output: "\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\bPython ",
  });
  python.exec("import sys");
  self.postMessage({ output: python.repr("sys.version").slice(1, -1) });
  self.postMessage({
    output:
      'Type "help", "copyright", "credits" or "license" for more information.\n',
  });
  self.postMessage({
    output:
      "Only output that your explicitly print will appear, e.g., print(2+3) works.\n",
  });
  self.postMessage({ prompt: true });
}

main();
*/
export {}
