export default async function main() {
  const s = await require("../..").syncPython({ fs: "sandbox" });
  try {
    s.exec("import numpy");
  } catch (err) {
    console.log(err);
  }
  s.exec('import sys; sys.path.insert(0,".")');
  s.exec('import os; os.chdir("/usr/lib/python3.11")');
  s.exec("import numpy");
  console.log(s.repr("numpy"));
  return s;
}
