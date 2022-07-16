import python from "python-wasm";

// See https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
const RED = "\x1b[0;31m";
const BLUE = "\x1b[0;34m";
const NC = "\x1b[0m";

self.onmessage = ({ data: { input } }) => {
  // console.log("got ", input);
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
};

async function main() {
  self.postMessage({ output: "Loading Python... " });
  await python.init();
  self.postMessage({ output: "\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\bPython " });
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
