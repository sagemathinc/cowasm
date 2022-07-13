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
    "Type code to execute.  Currently the only thing output is whatever is explicitly assigned to _ (underscore)."
  );
  localEcho.println(
    "This is because writing to a file (e.g., /dev/stdout) doesn't work yet, due to encoding issues."
  );

  // TODO: https://github.com/wavesoft/local-echo#addautocompletehandlercallback-args

  while (true) {
    try {
      const input = await localEcho.read(">>> ");
      python.exec(input);
      localEcho.println(python.repr("_"));
    } catch (err) {
      term.write(`ERROR: ${err}\r\n`);
    }
  }
}

main();
