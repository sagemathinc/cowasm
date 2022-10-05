import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import {dash} from "python-wasm";

export default async function terminal(element: HTMLDivElement) {
  console.log("Calling dash.init...");
  (window as any).dash = dash;
  const t = new Date();
  await dash.init();
  console.log("dash.init done; time = ", new Date().valueOf() - t.valueOf());
  const term = new Terminal({ convertEol: true });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
  setTheme(term, "solarized-light");
  term.onData((data) => {
    console.log("term.onData", data);
    dash.wasm.writeToStdin(data);
  });
  dash.wasm.on("stdout", (data) => {
    console.log("got ", data);
    term.write(data);
  });
  dash.wasm.on("stderr", (data) => {
    console.log("got ", data);
    term.write(data);
  });
  console.log("starting terminal");
  const r = await dash.wasm.terminal();
  console.log("terminal terminated", r);
}
