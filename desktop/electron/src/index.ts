import { app, BrowserWindow, ipcMain } from "electron";
import getPython, { pythonTerminate } from "./python";
import { join } from "path";

if (require("electron-squirrel-startup")) {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  app.quit();
}

declare global {
  interface Window {
    electronAPI: {
      pythonExec: (arg: string) => Promise<void>;
      pythonRepr: (arg: string) => Promise<string>;
      pythonStdin: (data: string) => void;
      pythonTerminal: () => void;
      onPythonStdout: (cb: (data: string) => void) => void;
      onPythonStderr: (cb: (data: string) => void) => void;
    };
  }
}

let mainWindow: null | BrowserWindow = null;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "CoWasm Desktop Python Shell",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  // mainWindow.webContents.openDevTools();
};
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.setMaxListeners(100);

ipcMain.handle("python:exec", async (_event, arg: string) => {
  const python = await getPython();
  return await python.exec(arg);
});

ipcMain.handle("python:repr", async (_event, arg: string) => {
  const python = await getPython();
  return await python.repr(arg);
});

ipcMain.on("python:stdin", async (_event, data) => {
  const python = await getPython();
  python.kernel.writeToStdin(data);
});

ipcMain.on("python:terminal", async (_event) => {
  const python = await getPython();
  python.kernel.on("stdout", (data: Buffer) => {
    mainWindow?.webContents.send("python:stdout", data);
  });
  python.kernel.on("stderr", (data: Buffer) => {
    mainWindow?.webContents.send("python:stderr", data);
  });
  await python.terminal();
  pythonTerminate();
});

async function main() {
  await app.whenReady();

  createWindow();
}

main();
