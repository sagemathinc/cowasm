import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  pythonExec: (arg: string) => ipcRenderer.invoke("python:exec", arg),
  pythonRepr: (arg: string) => ipcRenderer.invoke("python:repr", arg),
  pythonStdin: (data: string) => ipcRenderer.send("python:stdin", data),
  pythonTerminal: () => ipcRenderer.send("python:terminal"),
  onPythonStdout: (cb: (data: string) => void) =>
    ipcRenderer.on("python:stdout", (_event, data) => cb(data)),
  onPythonStderr: (cb: (data: string) => void) =>
    ipcRenderer.on("python:stderr", (_event, data) => cb(data)),
});
