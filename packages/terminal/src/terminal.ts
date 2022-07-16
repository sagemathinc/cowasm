import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import LocalEchoController from "local-echo";
import setTheme from "./theme";
const python = new Worker(new URL("./python.ts", import.meta.url));

export default async function terminal(element: HTMLDivElement) {
  const term = new Terminal({ rendererType: "dom" });
  term.open(element);
  // @ts-ignore
  element.children[0].style.padding = "15px";
  const localEcho = new LocalEchoController(term, { historySize: 200 });

  term.resize(128, 40);
  setTheme(term, "solarized-light");

  // TODO: https://github.com/wavesoft/local-echo#addautocompletehandlercallback-args
  const readline = async () => {
    const input = await localEcho.read(">>> ");
    python.postMessage({ input });
  };

  python.onmessage = ({ data: { output, prompt } }) => {
    if (output) {
      localEcho.print(output);
    }
    if (prompt) {
      readline();
    }
  };
}
