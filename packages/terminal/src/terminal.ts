import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import python from "python-wasm";

export default async function terminal(element: HTMLDivElement) {
  await python.init();
  const term = new Terminal({ convertEol: true });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
  setTheme(term, "solarized-light");
  term.onData((data) => {
    python.wasm.write(data);
  });
  python.wasm.on("stdout", (data) => {
    term.write(data);
  });
  python.wasm.on("stderr", (data) => {
    term.write(data);
  });
  await python.wasm.terminal();
}
