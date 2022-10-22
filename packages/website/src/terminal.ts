import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import { asyncPython } from "python-wasm";

export async function terminal(element: HTMLDivElement) {
  const term = new Terminal({ convertEol: true });
  term.open(element);
  const python = await asyncPython();
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(80, 40);
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
  await python.kernel.terminal([]);
}
