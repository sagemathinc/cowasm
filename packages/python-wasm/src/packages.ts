// TODO: Very preliminary!

import debug from "debug";
const log = debug("python-wasm:packages");

import numpy from "./numpy.tar.xz";
import mpmath from "./mpmath.tar.xz";
import sympy from "./sympy.tar.xz";

export async function fetchPackages(kernel) {
  log("fetching demo packages in parallel: numpy, mpmath, sympy");
  await Promise.all([
    kernel.fetch(numpy, "/usr/lib/python3.11/numpy.tar.xz"),
    kernel.fetch(mpmath, "/usr/lib/python3.11/mpmath.tar.xz"),
    kernel.fetch(sympy, "/usr/lib/python3.11/sympy.tar.xz"),
  ]);
  log("fetched packages");
}
