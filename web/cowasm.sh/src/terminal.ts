import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import { WebLinksAddon } from "xterm-addon-web-links";
import setTheme from "./theme";
import dashWasm from "dash-wasm";
import {
  clearHomeSnapshot,
  loadHomeSnapshot,
  saveHomeSnapshot,
  type Snapshot,
} from "./persistence";


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

const SNAPSHOT_BEGIN = "__COWASM_HOME_SNAPSHOT_BEGIN__";
const SNAPSHOT_END = "__COWASM_HOME_SNAPSHOT_END__";

function saveCommand(): string {
  return `cd /home/user && python -c 'import base64,io,os,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",zipfile.ZIP_STORED); [z.write(os.path.join(d,n), os.path.relpath(os.path.join(d,n),".")) for d,_,fs in os.walk(".") for n in fs]; z.close(); print("__COWASM_HOME_"+"SNAPSHOT_BEGIN__"); print(base64.b64encode(b.getvalue()).decode("ascii")); print("__COWASM_HOME_"+"SNAPSHOT_END__")'\n`;
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default async function terminal(element: HTMLDivElement) {
  console.log("creating dashWasm");
  const finishLoading = showLoading(element);
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:8px 15px;font:13px system-ui,sans-serif;color:#444";
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save /home/user";
  const restoreButton = document.createElement("button");
  restoreButton.textContent = "Restore";
  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear saved";
  const status = document.createElement("span");
  status.style.marginLeft = "8px";
  for (const button of [saveButton, restoreButton, clearButton]) {
    button.style.cssText =
      "font:13px system-ui,sans-serif;padding:4px 8px;border:1px solid #bbb;background:#fff;border-radius:4px;cursor:pointer";
  }
  toolbar.append(saveButton, restoreButton, clearButton, status);
  element.appendChild(toolbar);
  const term = new Terminal({ convertEol: true });
  term.open(element);
  term.focus();
  const terminalElement = element.querySelector(".terminal") as HTMLDivElement;
  terminalElement.style.padding = "15px";
  term.resize(128, 40);
  const setPersistenceStatus = (message: string) => {
    console.log(`cowasm.sh persistence: ${message}`);
    status.textContent = message;
  };

  let startupSnapshot: Snapshot | undefined;
  try {
    startupSnapshot = await loadHomeSnapshot();
  } catch (err) {
    setPersistenceStatus(
      `could not load saved /home/user: ${err instanceof Error ? err.message : err}`
    );
  }

  let homeDirectoryZip: Uint8Array | undefined;
  if (startupSnapshot) {
    try {
      homeDirectoryZip = decodeBase64(startupSnapshot.data);
    } catch (err) {
      await clearHomeSnapshot();
      startupSnapshot = undefined;
      setPersistenceStatus(
        `cleared unreadable /home/user snapshot: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }

  const env = {
    COLUMNS: `${term.cols}`,
    LINES: `${term.rows}`,
    HOME: "/home/user",
  };
  let dash;
  try {
    dash = await dashWasm({ env, homeDirectoryZip });
  } catch (err) {
    if (!startupSnapshot) {
      finishLoading();
      term.write(
        `\r\nCoWasm failed to start: ${
          err instanceof Error ? err.stack ?? err.message : err
        }\r\n`
      );
      throw err;
    }
    console.warn("failed to start with saved /home/user; clearing snapshot", err);
    await clearHomeSnapshot();
    startupSnapshot = undefined;
    setPersistenceStatus("cleared incompatible /home/user snapshot; restarted");
    dash = await dashWasm({ env });
  }
  finishLoading();
  (window as any).dash = dash;
  (window as any).term = term;
  const t = new Date();
  console.log("dash.init done; time = ", new Date().valueOf() - t.valueOf());
  setTheme(term, "solarized-light");

  term.options.allowProposedApi = true;
  term.loadAddon(new WebLinksAddon());
  let suppressTerminalInputUntil = 0;
  let shellAtPrompt = false;
  let shellExited = false;
  let shellExitCode: number | undefined;
  let capturingSnapshot = false;
  let snapshotBuffer = "";
  let outputLookbehind = "";
  let pendingSave:
    | {
        resolve: (snapshot: Snapshot) => void;
        reject: (err: Error) => void;
      }
    | undefined;
  let persistenceReadyDone = false;
  let persistenceReadyResolve: () => void;
  const persistenceReady = new Promise<void>((resolve) => {
    persistenceReadyResolve = resolve;
  });
  const markPersistenceReady = () => {
    if (!persistenceReadyDone) {
      persistenceReadyDone = true;
      persistenceReadyResolve();
    }
  };

  const pasteFromClipboard = async () => {
    const text = await navigator.clipboard?.readText().catch(() => "");
    if (!text) {
      return;
    }
    if (text.includes("\r") || text.includes("\n")) {
      shellAtPrompt = false;
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

  const saveHome = async (): Promise<Snapshot> => {
    if (pendingSave) {
      throw Error("A CoWasm save is already running.");
    }
    if (!shellAtPrompt) {
      throw Error("Wait for the shell prompt before saving.");
    }
    setPersistenceStatus("saving /home/user");
    shellAtPrompt = false;
    return await new Promise<Snapshot>((resolve, reject) => {
      pendingSave = { resolve, reject };
      dash.kernel.writeToStdin(saveCommand());
    });
  };

  const restoreHome = async (): Promise<void> => {
    const snapshot = await loadHomeSnapshot();
    if (!snapshot) {
      return;
    }
    setPersistenceStatus("reloading to restore /home/user");
    location.reload();
  };

  const clearHome = async (): Promise<void> => {
    await clearHomeSnapshot();
    setPersistenceStatus("cleared /home/user snapshot");
  };

  saveButton.onclick = () => {
    void saveHome().catch((err) =>
      setPersistenceStatus(err instanceof Error ? err.message : `${err}`)
    );
  };
  restoreButton.onclick = () => {
    void restoreHome().catch((err) =>
      setPersistenceStatus(err instanceof Error ? err.message : `${err}`)
    );
  };
  clearButton.onclick = () => {
    void clearHome().catch((err) =>
      setPersistenceStatus(err instanceof Error ? err.message : `${err}`)
    );
  };

  (window as any).cowasmPersistence = {
    save: saveHome,
    restore: restoreHome,
    clear: clearHome,
    load: loadHomeSnapshot,
    ready: persistenceReady,
  };

  const processOutput = (text: string): string => {
    if (!pendingSave && !capturingSnapshot && !outputLookbehind) {
      return text;
    }
    let remaining = outputLookbehind + text;
    outputLookbehind = "";
    let display = "";
    const markerKeep = Math.max(SNAPSHOT_BEGIN.length, SNAPSHOT_END.length) - 1;
    while (remaining.length > 0) {
      if (capturingSnapshot) {
        const end = remaining.indexOf(SNAPSHOT_END);
        if (end == -1) {
          if (remaining.length > markerKeep) {
            snapshotBuffer += remaining.slice(0, -markerKeep);
            outputLookbehind = remaining.slice(-markerKeep);
          } else {
            outputLookbehind = remaining;
          }
          return display;
        }
        snapshotBuffer += remaining.slice(0, end);
        remaining = remaining.slice(end + SNAPSHOT_END.length);
        capturingSnapshot = false;
        const data = snapshotBuffer.replace(/[\r\n]/g, "");
        snapshotBuffer = "";
        void saveHomeSnapshot(data)
          .then((snapshot) => {
            setPersistenceStatus(`saved /home/user at ${snapshot.savedAt}`);
            pendingSave?.resolve(snapshot);
            pendingSave = undefined;
          })
          .catch((err) => {
            pendingSave?.reject(err instanceof Error ? err : Error(`${err}`));
            pendingSave = undefined;
          });
        continue;
      }
      const begin = remaining.indexOf(SNAPSHOT_BEGIN);
      const next = begin >= 0 ? begin : undefined;
      if (next == null) {
        if (!pendingSave) {
          display += remaining;
        } else if (remaining.length > markerKeep) {
          display += remaining.slice(0, -markerKeep);
          outputLookbehind = remaining.slice(-markerKeep);
        } else {
          outputLookbehind = remaining;
        }
        return display;
      }
      display += remaining.slice(0, next);
      if (begin == next) {
        remaining = remaining.slice(begin + SNAPSHOT_BEGIN.length);
        capturingSnapshot = true;
      }
    }
    return display;
  };

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
    if (shellExited) {
      return;
    }
    if (Date.now() < suppressTerminalInputUntil) {
      return;
    }
    if (data.includes("\r") || data.includes("\n")) {
      shellAtPrompt = false;
    }
    dash.kernel.writeToStdin(data);
  });
  dash.kernel.on("stdout", (data) => {
    const text = dataToString(data);
    const hasPrompt = text.includes("(cowasm)$ ");
    if (hasPrompt) {
      shellAtPrompt = true;
    }
    const display = processOutput(text);
    if (display) {
      term.write(display);
    }
    if (hasPrompt) {
      markPersistenceReady();
    }
  });
  dash.kernel.on("stderr", (data) => {
    const text = dataToString(data);
    const hasPrompt = text.includes("(cowasm)$ ");
    if (hasPrompt) {
      shellAtPrompt = true;
    }
    const display = processOutput(text);
    if (display) {
      term.write(display);
    }
    if (hasPrompt) {
      markPersistenceReady();
    }
  });
  dash.kernel.on("terminate", () => {
    shellExited = true;
    term.write(
      `\r\n[CoWasm shell exited${
        shellExitCode == null ? "" : ` with code ${shellExitCode}`
      }; reload the page to start a new shell.]\r\n`
    );
  });
  console.log("starting terminal");
  if (startupSnapshot) {
    setPersistenceStatus(`restored /home/user from ${startupSnapshot.savedAt}`);
  }
  markPersistenceReady();
  const shellStart = Date.now();
  const terminalPromise = dash.terminal();
  await dash.kernel.writeToStdin("mkdir -p /home/user && cd /home/user\n");
  term.focus();
  const r = await terminalPromise;
  shellExitCode = r;
  console.log("terminal terminated", r);
  if (startupSnapshot && r != 0 && Date.now() - shellStart < 10000) {
    await clearHomeSnapshot();
    setPersistenceStatus(
      `cleared saved /home/user after shell exited with ${r}; reloading`
    );
    location.reload();
    return;
  }
  dash.kernel.terminate();
}
