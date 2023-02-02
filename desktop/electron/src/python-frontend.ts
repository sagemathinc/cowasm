export default async function python() {
  const element = document.createElement("pre");
  document.body.appendChild(element);
  console.log("This is python...!");
  let t0 = performance.now();
  await window.electronAPI.pythonExec("import os, sys");
  element.innerText = `Python startup time: ${performance.now() - t0}ms\n`;
  t0 = performance.now();
  const v = await window.electronAPI.pythonRepr("sys.version");
  console.log(v);
  element.innerText +=
    "\n" + v.slice(1, -1) + `\nTime: ${performance.now() - t0}ms\n`;

  // filesystem
  element.innerText +=
    "\nNative Files:\n" +
    (await window.electronAPI.pythonRepr("' '.join(os.listdir('.'))")) +
    "\n";

  await window.electronAPI.pythonExec(`
import pandas
from contextlib import redirect_stdout
import io
f = io.StringIO()
with redirect_stdout(f):
    print("PYTHONHOME = ", os.environ.get('PYTHONHOME'))
    print("sys.path = ", sys.path)
    pandas.show_versions()
s = f.getvalue()
`);
  let pv = await window.electronAPI.pythonRepr("s");
  console.log(pv);
  pv = pv.split("\\n").join("\n").slice(1, -1);
  console.log(pv);
  pv = `Time to import pandas and get versions: ${Math.round(
    performance.now() - t0
  )}ms\n${pv}`;
  element.innerText += "\n" + pv;
}
