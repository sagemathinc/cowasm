import sys

sys.path.insert(0, ".")
sys.path.insert(0, "build/lib.wasi-0.0.0-wasm32-cpython-311/")

import fib
import numbers

from time import time
from bench import all


def run_all_benchmarks():
    t = time()
    all()
    print("=" * 20)
    print("Grand total time: ", int((time() - t) * 1000), "ms")


if __name__ == '__main__':
    run_all_benchmarks()
