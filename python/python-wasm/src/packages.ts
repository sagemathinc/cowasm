// TODO: Very preliminary!

import debug from "debug";
const log = debug("python-wasm:packages");

import numpy from "./numpy.tar.xz";
import mpmath from "./mpmath.tar.xz";
import sympy from "./sympy.tar.xz";
import pandas from "./pandas.tar.xz";
import six from "./six.tar.xz";
import pytz from "./pytz.tar.xz";
import dateutil from "./dateutil.tar.xz";

export async function fetchPackages(kernel) {
  log("fetching demo packages in parallel: numpy, mpmath, sympy");
  await Promise.all([
    kernel.fetch(numpy, "/usr/lib/python3.14/numpy.tar.xz"),
    kernel.fetch(mpmath, "/usr/lib/python3.14/mpmath.tar.xz"),
    kernel.fetch(sympy, "/usr/lib/python3.14/sympy.tar.xz"),
    kernel.fetch(pandas, "/usr/lib/python3.14/pandas.tar.xz"),
    kernel.fetch(six, "/usr/lib/python3.14/six.tar.xz"),
    kernel.fetch(pytz, "/usr/lib/python3.14/pytz.tar.xz"),
    kernel.fetch(dateutil, "/usr/lib/python3.14/dateutil.tar.xz"),
  ]);
  log("fetched packages");
}
