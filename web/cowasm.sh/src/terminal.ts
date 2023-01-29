import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import { WebLinksAddon } from "xterm-addon-web-links";
import setTheme from "./theme";
import dashWasm from "dash-wasm";


// https://patorjk.com/software/taag/#p=display&f=Ogre&t=CoCalc%0ACoWasm

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

  term.options.allowProposedApi = true;
  term.loadAddon(new WebLinksAddon());

  term.write(
    "Type 'ls /usr/bin' for a list of commands, including python (with numpy), lua, sqlite3, date, and du.\n"
  );
  term.write(
    "This is new and *many* things are not implemented.  Output redirection and capture is not implemented.\n"
  );
  term.write("Visit https://github.com/sagemathinc/cowasm and contribute.\n\n");
  term.write(`   ___     __    __
  / __\\___/ / /\\ \\ \\__ _ ___ _ __ ___
 / /  / _ \\ \\/  \\/ / _\` / __| '_ \` _ \\
/ /__| (_) \\  /\\  / (_| \\__ \\ | | | | |
\\____/\\___/ \\/  \\/ \\__,_|___/_| |_| |_|

`);
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
