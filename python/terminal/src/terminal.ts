import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import pythonWasm from "python-wasm";

export default async function terminal(element: HTMLDivElement) {
  console.log("creating pythonWasm");
  const python = await pythonWasm();
  (window as any).python = python;
  const t = new Date();
  console.log("python.init done; time = ", new Date().valueOf() - t.valueOf());
  await python.exec("import readline");
  console.log("readline = ", await python.repr("readline"));
  const term = new Terminal({ convertEol: true });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(128, 40);
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
  console.log("starting terminal");
  const r = await python.terminal();
  console.log("terminal terminated", r);
  python.kernel.terminate();
}
