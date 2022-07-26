import python from "python-wasm";

async function demo() {
  const t0 = new Date();
  console.log("call python init");

  // change to noWorker:true to not use a webworker, i.e., everything in the main thread.
  await python.init({ noWorker: false });

  console.log(`Loaded python in ${new Date().valueOf() - t0.valueOf()}ms.`);

  const element = document.createElement("pre");

  // Run some code in Python that defines variables n and s.
  await python.exec(
    "from random import randint; n=randint(0,10**6); s = sum(range(n))"
  );
  await python.exec("import sys");
  // Use python.repr to get their string representation:
  element.innerHTML = `${await python.repr(
    "sys.version"
  )}\n\n1 + 2 + 3 + ... + ${await python.repr("n")} = ${await python.repr(
    "s"
  )}`;

  document.body.appendChild(element);
}

demo();
