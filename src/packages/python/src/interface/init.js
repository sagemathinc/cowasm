(async () => {
  console.log("Definining pyRun, pyEval, pyStr...");
  global.python = python = await require("./interface")();
  python._init();
  global.pyRun = python.cwrap("py_run", null, ["string"]);
  global.pyEval = python.cwrap("py_eval", "number", ["string"]);
  global.pyMul = python.cwrap("py_mul", "number", ["number", "number"]);
  const pyTmpStringFree = python.cwrap("py_tmp_string_free", null, []);
  const pyRepr = python.cwrap("py_repr", "string", ["number"]);
  const pyStr = python.cwrap("py_str", "string", ["number"]);
  global.pyRepr = (obj) => {
    const s = pyRepr(obj);
    pyTmpStringFree();
    return s;
  };
  global.pyStr = (obj) => {
    const s = pyStr(obj);
    pyTmpStringFree();
    return s;
  };
  console.log("Ready!");
})();
