import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import LocalEchoController from "local-echo";
import setTheme from "./theme";

export default async function terminal(element: HTMLDivElement) {
  const python = new Worker(new URL("./python.ts", import.meta.url));
  const sharedBuffer = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sharedBuffer);
  const pause = () => {
    console.log("pause");
    Atomics.store(int32, 0, 1);
    Atomics.notify(int32, 0);
  };
  const resume = () => {
    console.log("resume");
    Atomics.store(int32, 0, 0);
    Atomics.notify(int32, 0);
  };
  python.postMessage({ init: sharedBuffer });

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

  python.onmessage = ({ data: { output, prompt, sleep } }) => {
    if (sleep) {
      pause();
      setTimeout(resume, sleep);
    }
    if (output) {
      localEcho.print(output);
    }
    if (prompt) {
      readline();
    }
  };
}
