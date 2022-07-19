import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
//import python from "python-wasm";

export default async function terminal(element: HTMLDivElement) {
  const term = new Terminal();
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
  setTheme(term, "solarized-light");
}


