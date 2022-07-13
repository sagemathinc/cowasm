import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import LocalEchoController from "local-echo";
import python from "python-wasm";
import setTheme from "./theme";
(window as any).python = python;

async function main() {
  await python.init();

  const link = document.createElement("div");
  link.innerHTML = "<div style='text-align:center'><h1>python-wasm</h1><h3 style><a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>NPM</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/python-wasm#readme'/>GitHub</a></h3></div>";
  document.body.appendChild(link);
  const element = document.createElement("div");
  document.body.appendChild(element);
  document.body.style.margin = '0px';

  const term = new Terminal();
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = '15px';
  const localEcho = new LocalEchoController(term, { historySize: 200 });

  term.resize(120, 40);
  setTheme(term, "solarized-light");
  python.exec("import sys");
  localEcho.println("Python " + python.repr("sys.version").slice(1, -1));
  localEcho.println("Type code to execute.  Currently the only thing output is whatever is explicitly assigned to _ (underscore).")
  localEcho.println("This is because writing to a file (e.g., /dev/stdout) doesn't work yet, due to encoding issues.")

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
