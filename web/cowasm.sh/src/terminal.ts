import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import { WebLinksAddon } from "xterm-addon-web-links";
import setTheme from "./theme";
import dashWasm from "dash-wasm";


// https://patorjk.com/software/taag/#p=display&f=Ogre&t=CoCalc%0ACoWasm

function showLoading(element: HTMLDivElement): () => void {
  const loading = document.createElement("div");
  loading.style.font = "14px system-ui, sans-serif";
  loading.style.color = "#555";
  loading.style.padding = "12px 15px 0";
  loading.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <span>Loading CoWasm...</span>
      <div style="height:6px;flex:1;background:#d8dee4;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:0%;background:#2f81f7;border-radius:999px;transition:width 0.2s linear"></div>
      </div>
    </div>`;
  element.appendChild(loading);
  const bar = loading.querySelector("div div div") as HTMLDivElement;
  const started = Date.now();
  const timer = window.setInterval(() => {
    const elapsed = Date.now() - started;
    const percent = Math.min(95, Math.round((elapsed / 15000) * 100));
    bar.style.width = `${percent}%`;
  }, 200);

  return () => {
    window.clearInterval(timer);
    bar.style.width = "100%";
    window.setTimeout(() => loading.remove(), 150);
  };
}

function dataToString(data: any): string {
  if (typeof data == "string") {
    return data;
  }
  return new TextDecoder().decode(data);
}

export default async function terminal(element: HTMLDivElement) {
  console.log("creating dashWasm");
  const finishLoading = showLoading(element);
  const term = new Terminal({ convertEol: true });
  term.open(element);
  const terminalElement = element.querySelector(".terminal") as HTMLDivElement;
  terminalElement.style.padding = "15px";
  term.resize(128, 40);
  const dash = await dashWasm({
    env: {
      COLUMNS: `${term.cols}`,
      LINES: `${term.rows}`,
      HOME: "/home/user",
    },
  });
  finishLoading();
  (window as any).dash = dash;
  const t = new Date();
  console.log("dash.init done; time = ", new Date().valueOf() - t.valueOf());
  setTheme(term, "solarized-light");

  term.options.allowProposedApi = true;
  term.loadAddon(new WebLinksAddon());
  let suppressTerminalInputUntil = 0;
  let shellAtPrompt = false;

  const pasteFromClipboard = async () => {
    const text = await navigator.clipboard?.readText().catch(() => "");
    if (!text) {
      return;
    }
    dash.kernel.writeToStdin(text);
  };

  term.attachCustomKeyEventHandler((event) => {
    if (
      event.type == "keydown" &&
      event.key.toLowerCase() == "c" &&
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      if (term.hasSelection()) {
        const text = term.getSelection();
        navigator.clipboard?.writeText(text).catch(() => {
          document.execCommand("copy");
        });
        return false;
      }
      if (shellAtPrompt) {
        return false;
      }
      dash.kernel.writeToStdin("\x03");
      return false;
    }
    if (
      event.type == "keydown" &&
      event.key.toLowerCase() == "v" &&
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      suppressTerminalInputUntil = Date.now() + 250;
      pasteFromClipboard();
      return false;
    }
    return true;
  });

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
    if (Date.now() < suppressTerminalInputUntil) {
      return;
    }
    if (data.includes("\r") || data.includes("\n")) {
      shellAtPrompt = false;
    }
    dash.kernel.writeToStdin(data);
  });
  dash.kernel.on("stdout", (data) => {
    if (dataToString(data).includes("(cowasm)$ ")) {
      shellAtPrompt = true;
    }
    term.write(data);
  });
  dash.kernel.on("stderr", (data) => {
    if (dataToString(data).includes("(cowasm)$ ")) {
      shellAtPrompt = true;
    }
    term.write(data);
  });
  console.log("starting terminal");
  const terminalPromise = dash.terminal();
  await dash.kernel.writeToStdin("mkdir -p /home/user && cd /home/user\n");
  const r = await terminalPromise;
  console.log("terminal terminated", r);
  dash.kernel.terminate();
}
