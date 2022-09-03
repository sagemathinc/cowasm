import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import setTheme from "./theme";
import python from "python-wasm";

export default async function terminal(element: HTMLDivElement) {
  if (!crossOriginIsolated) {
    element.innerHTML =
      "<div style='font-family:sans-serif;font-size:14pt;text-align:center;color:white;background:darkred;max-width:600px;margin:auto;padding:15px;border-radius: 5px;'>WebAssembly with cross-origin isolation requires the most recent version of Chrome, Safari, or Firefox.</div>";
    return;
  }
  const term = new Terminal({convertEol: true});
  term.open(element);
  await python.init();
  // @ts-ignore
  element.children[0].style.padding = "15px";
  term.resize(80, 40);
  setTheme(term, "solarized-light");
  term.onData((data) => {
    python.wasm.writeToStdin(data);
  });
  python.wasm.on("stdout", (data) => {
    term.write(data);
  });
  python.wasm.on("stderr", (data) => {
    term.write(data);
  });
  await python.wasm.terminal();
}
