window.process = require("process/");
window.Buffer = require("buffer/").Buffer;

//import python from "python-wasm";
const python = require("python-wasm");
(window as any).python = python; // so you can play with this in your dev console.

async function demo() {
  const t0 = new Date();
  console.log("call python init");
  await python.init();
  console.log(`Loaded python in ${new Date().valueOf() - t0.valueOf()}ms.`);

  const element = document.createElement("pre");

  // Run some code in Python that defines variables n and s.
  python.exec(
    "from random import randint; n=randint(0,10**6); s = sum(range(n))"
  );
  python.exec("import sys");
  // Use python.repr to get their string representation:
  element.innerHTML = `${python.repr(
    "sys.version"
  )}\n\n1 + 2 + 3 + ${python.repr("n")} = ${python.repr("s")}`;

  document.body.appendChild(element);
}

demo();
