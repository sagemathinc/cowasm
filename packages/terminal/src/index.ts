import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import python from "python-wasm";
import setTheme from "./theme";
(window as any).python = python;

async function main() {
  await python.init();

  const element = document.createElement("div");
  document.body.appendChild(element);

  const terminal = new Terminal();
  terminal.resize(120, 40);
  setTheme(terminal, 'solarized-light');
  terminal.open(element);
  python.exec("import sys");
  terminal.write(python.repr("sys.version"));

}

main();
