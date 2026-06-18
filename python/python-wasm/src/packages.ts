// TODO: Very preliminary!

import debug from "debug";
const log = debug("python-wasm:packages");

import numpy from "./numpy.tar.xz";
import mpmath from "./mpmath.tar.xz";
import sympy from "./sympy.tar.xz";
import networkx from "./networkx.tar.xz";
import pandas from "./pandas.tar.xz";
import six from "./six.tar.xz";
import pytz from "./pytz.tar.xz";
import dateutil from "./dateutil.tar.xz";
import { pythonLibPath } from "./constants";

export async function fetchPackages(kernel) {
  log("fetching demo packages in parallel: numpy, mpmath, sympy, networkx");
  await Promise.all([
    kernel.fetch(numpy, pythonLibPath("numpy.tar.xz")),
    kernel.fetch(mpmath, pythonLibPath("mpmath.tar.xz")),
    kernel.fetch(sympy, pythonLibPath("sympy.tar.xz")),
    kernel.fetch(networkx, pythonLibPath("networkx.tar.xz")),
    kernel.fetch(pandas, pythonLibPath("pandas.tar.xz")),
    kernel.fetch(six, pythonLibPath("six.tar.xz")),
    kernel.fetch(pytz, pythonLibPath("pytz.tar.xz")),
    kernel.fetch(dateutil, pythonLibPath("dateutil.tar.xz")),
  ]);
  log("fetched packages");
}
