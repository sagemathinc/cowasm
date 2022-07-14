import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import python from "python-wasm";
import setTheme from "./theme";
(window as any).python = python;

async function main() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  document.body.style.margin = "0px";

  const term = new Terminal();
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
  setTheme(term, "solarized-light");
  await python.init();
  // what we wish to do, but this of course just hangs/deadlocks and makes no sense.
  // we really needed to be more clever...
//   python.wasm.exports.pymain()

}

main();
