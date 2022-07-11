window.process = require("process/");
window.Buffer = require("buffer/").Buffer;

const python = require("@wapython/core");
(window as any).python = python;

import wasmUrl from "@wapython/core/python.wasm";
import zipUrl from "@wapython/core/python.zip";

async function demo() {
  const t0 = new Date();
  console.log("call python init");
  await python.init({ zipUrl, wasmUrl });
  console.log(`Loaded python in ${new Date().valueOf() - t0.valueOf()}ms.`);

  const element = document.createElement("div");

  // Run some code in Python that defines variables n and s.
  python.exec(
    "from random import randint; n=randint(0,10**6); s = sum(range(n))"
  );
  // Use python.repr to get their string representation:
  element.innerHTML = `1 + 2 + 3 + ${python.repr("n")} = ${python.repr("s")}`;

  document.body.appendChild(element);
}

demo();
