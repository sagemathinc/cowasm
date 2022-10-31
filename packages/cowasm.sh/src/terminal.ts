import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import dashWasm from "dash-wasm";

export default async function terminal(element: HTMLDivElement) {
  console.log("creating dashWasm");
  const dash = await dashWasm();
  (window as any).dash = dash;
  const t = new Date();
  console.log("dash.init done; time = ", new Date().valueOf() - t.valueOf());
  const term = new Terminal({ convertEol: true });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
  setTheme(term, "solarized-light");
  term.onData((data) => {
    dash.kernel.writeToStdin(data);
  });
  dash.kernel.on("stdout", (data) => {
    term.write(data);
  });
  dash.kernel.on("stderr", (data) => {
    term.write(data);
  });
  console.log("starting terminal");
  const r = await dash.terminal();
  console.log("terminal terminated", r);
  dash.kernel.terminate();
}
