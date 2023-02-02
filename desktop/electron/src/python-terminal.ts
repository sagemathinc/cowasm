import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./xterm-theme";
import { WebLinksAddon } from "xterm-addon-web-links";

export default async function terminal(element: HTMLDivElement) {
  const term = new Terminal({ convertEol: true });
  term.options.allowProposedApi = true;
  term.loadAddon(new WebLinksAddon());
  term.open(element);
  (element.children[0] as any).style.padding = "15px";
  term.resize(80, 40);
  term.write(
    "This is a demo of https://www.npmjs.com/package/python-wasm\nIt includes numpy, sympy and pandas. "
  );
  term.write(
    "Try 'import pandas' below.\nControl+c to interrupt and time.sleep to pause are also supported.\n\n"
  );
  setTheme(term, "solarized-light");

  // Start the terminal:
  window.electronAPI.pythonTerminal();

  // process output from the terminal
  window.electronAPI.onPythonStdout((data) => {
    term.write(data);
  });
  window.electronAPI.onPythonStderr((data) => {
    term.write(data);
  });

  term.onData((data) => {
    window.electronAPI.pythonStdin(data);
  });
  /*
  const python = await pythonWasm();
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(80, 40);
  term.write(
    "This is a demo of https://www.npmjs.com/package/python-wasm\nIt includes numpy and sympy. "
  );
  term.write(
    "Try 'import numpy' and 'import sympy' below.\nControl+c to interrupt and time.sleep to pause are also supported.\n\n"
  );
  setTheme(term, "solarized-light");
  term.onData((data) => {
    python.kernel.writeToStdin(data);
  });
  python.kernel.on("stdout", (data) => {
    term.write(data);
  });
  python.kernel.on("stderr", (data) => {
    term.write(data);
  });
  await python.terminal();
  python.kernel.terminate();
  */
}
