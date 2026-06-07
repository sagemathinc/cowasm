import terminal from "./terminal";
import { clearHomeSnapshot } from "./persistence";

declare global {
  interface Window {
    __cowasmShSmoke?: { status: string; details?: string };
    dash?: any;
    term?: any;
    cowasmPersistence?: {
      save: () => Promise<unknown>;
      restore: () => Promise<void>;
      clear: () => Promise<void>;
      ready: Promise<void>;
    };
  }
}

let clipboardText = "";
let copiedText = "";

function setStatus(status: string, details?: string) {
  window.__cowasmShSmoke = { status, details };
  document.body.dataset.cowasmSmoke = status;
  document.body.setAttribute("data-cowasm-smoke-details", details ?? status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(f: () => boolean, timeout = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout && !f()) {
    await delay(50);
  }
}

function terminalText(): string {
  return document.querySelector(".xterm-rows")?.textContent ?? "";
}

function textarea(): HTMLTextAreaElement {
  const node = document.querySelector(".xterm-helper-textarea");
  if (!(node instanceof HTMLTextAreaElement)) {
    throw Error("xterm textarea not found");
  }
  return node;
}

function dispatchCtrlKey(key: string): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    code: `Key${key.toUpperCase()}`,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  return textarea().dispatchEvent(event);
}

async function waitForPrompt(): Promise<void> {
  await waitUntil(() => terminalText().includes("(cowasm)$ "));
  if (!terminalText().includes("(cowasm)$ ")) {
    throw Error(`dash prompt did not appear: ${terminalText()}`);
  }
}

async function writeToTerminal(data: string): Promise<void> {
  window.dash.kernel.writeToStdin(data);
}

async function pasteToTerminal(data: string): Promise<void> {
  clipboardText = data;
  dispatchCtrlKey("v");
  await delay(250);
}

async function main() {
  setStatus("running", "terminal setup");
  const phase = sessionStorage.getItem("cowasm-sh-smoke-phase") ?? "initial";
  if (phase == "initial") {
    await clearHomeSnapshot();
  }
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      readText: async () => clipboardText,
      writeText: async (text: string) => {
        copiedText = text;
      },
    },
  });

  try {
    const element = document.createElement("div");
    document.body.appendChild(element);
    document.body.style.margin = "0px";
    void terminal(element);
    await waitUntil(() => window.cowasmPersistence != null);
    if (!window.cowasmPersistence) {
      throw Error("persistence API did not initialize");
    }
    await window.cowasmPersistence.ready;
    await waitForPrompt();
    textarea().focus();

    if (phase == "reloaded") {
      setStatus("running", "terminal persistence reload");
      await writeToTerminal("cat /home/user/persisted.txt\n");
      await waitUntil(() => terminalText().includes("persisted across reload"));
      if (!terminalText().includes("persisted across reload")) {
        throw Error(`persisted file did not restore: ${terminalText()}`);
      }
      await pasteToTerminal("echo reload-ui-alive\n");
      await waitUntil(() => terminalText().includes("reload-ui-alive"));
      if (!terminalText().includes("reload-ui-alive")) {
        throw Error(`terminal input did not work after restore: ${terminalText()}`);
      }
      sessionStorage.removeItem("cowasm-sh-smoke-phase");
      setStatus("pass", "terminal persistence reload ok");
      return;
    }

    await window.cowasmPersistence?.clear();

    setStatus("running", "terminal paste");
    clipboardText = "printf x >> /home/user/paste-count\n";
    dispatchCtrlKey("v");
    await delay(500);
    await writeToTerminal("cat /home/user/paste-count\n");
    await waitUntil(() => terminalText().includes("cat /home/user/paste-count"));
    await waitUntil(() => /\bx\b/.test(terminalText()));
    if (terminalText().includes("xx")) {
      throw Error(`paste happened more than once: ${terminalText()}`);
    }

    setStatus("running", "terminal copy");
    copiedText = "";
    window.term.selectAll();
    dispatchCtrlKey("c");
    await waitUntil(() => copiedText.length > 0, 3000);
    if (!copiedText.includes("python") || !copiedText.includes("(cowasm)$")) {
      throw Error(`selected Ctrl+C did not copy terminal text: ${copiedText}`);
    }
    window.term.clearSelection();

    setStatus("running", "idle ctrl-c");
    dispatchCtrlKey("c");
    await delay(500);
    await writeToTerminal("echo ctrlc-alive\n");
    await waitUntil(() => terminalText().includes("ctrlc-alive"));
    if (!terminalText().includes("ctrlc-alive")) {
      throw Error(`dash did not survive idle Ctrl+C: ${terminalText()}`);
    }

    setStatus("running", "terminal python interrupt");
    await pasteToTerminal("python\n");
    await waitUntil(() => terminalText().includes(">>> "));
    await pasteToTerminal("while True:\n    pass\n\n");
    await delay(500);
    dispatchCtrlKey("c");
    await waitUntil(() => terminalText().includes("KeyboardInterrupt"));
    if (!terminalText().includes("KeyboardInterrupt")) {
      throw Error(`Python did not interrupt through terminal UI: ${terminalText()}`);
    }
    await writeToTerminal("\x04");
    await delay(500);

    setStatus("running", "terminal persistence save");
    await pasteToTerminal(
      "printf 'persisted across reload' > /home/user/persisted.txt; echo persistence-written\n"
    );
    await waitUntil(() => terminalText().includes("persistence-written"));
    await window.cowasmPersistence?.save();
    sessionStorage.setItem("cowasm-sh-smoke-phase", "reloaded");
    location.reload();
  } catch (err) {
    sessionStorage.removeItem("cowasm-sh-smoke-phase");
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
