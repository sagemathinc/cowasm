import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import LocalEchoController from "local-echo";
import python from "python-wasm";
import setTheme from "./theme";
(window as any).python = python;

async function main() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  document.body.style.margin = "0px";

  const term = new Terminal({ rendererType: "dom" });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  const localEcho = new LocalEchoController(term, { historySize: 200 });

  term.resize(128, 40);
  setTheme(term, "solarized-light");
  localEcho.print("Python ");
  await python.init();
  python.exec("import sys");
  localEcho.println(python.repr("sys.version").slice(1, -1));
  localEcho.println(
    'Type "help", "copyright", "credits" or "license" for more information.'
  );

  // TODO: https://github.com/wavesoft/local-echo#addautocompletehandlercallback-args

  while (true) {
    try {
      const input = await localEcho.read(">>> ");
      python.exec(input);
      for (const stream of ["stderr", "stdout"]) {
        // @ts-ignore: TODO: why isn't readFileSync defined in typescript?
        const s = python.wasm.fs.readFileSync("/dev/" + stream).toString();
        if (s) {
          localEcho.println(s);
        // @ts-ignore: TODO: why isn't writeFileSync defined in typescript?
          python.wasm.fs.writeFileSync("/dev/" + stream, "");
        }
      }
    } catch (err) {
      term.write(`ERROR: ${err}\r\n`);
    }
  }
}

main();
