import python from "python-wasm";

async function demo() {
  const log = console.log;
  const t0 = new Date();
  (window as any).python = python;

  // change to noWorker:true to not use a webworker, i.e., everything in the main thread.
  // Note that if noWorker =true, then dynamic library loading can't work.
  log("call python init");
  await python.init();
  log(`Loaded python in ${new Date().valueOf() - t0.valueOf()}ms.`);

  const element = document.createElement("pre");
  await python.exec("import _pickle");
  log(await python.repr("_pickle"));
  log(await python.repr("2+3"));

  // Run some code in Python that defines variables n and s.
  await python.exec("from random import randint; n = randint(0,10**6)");
  log("computed n = ", await python.repr("n"));
  await python.exec("s = sum(range(n))");
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
