import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import { WebLinksAddon } from "xterm-addon-web-links";
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

  term.options.allowProposedApi = true;
  term.loadAddon(new WebLinksAddon());

  term.write(
    "Type 'ls /usr/bin' for a list of commands.  CoWasm shell is very new and *most* things are currently completely broken!  \n"
  );
  term.write(
    "You can run a subcommand once, but possibly not multiple times.  Output redirection and capture is not implemented at all.\n"
  );
  term.write(
    "Many commands are not fully implemented.  Fork at https://github.com/sagemathinc/cowasm and help out!\n\n"
  );
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
