# mypy
from typing import Callable


def time(f: Callable, *args) -> int:
    from time import time as time0
    t = time0()
    f(*args)
    return int((time0() - t) * 1000)


benchmarks = []


def register(name: str, f: Callable) -> None:
    global benchmarks
    benchmarks.append((name, f))


def reset() -> None:
    benchmarks.clear()


def all(desc: str = '') -> None:
    print("-" * 20)
    print("Running...", desc)
    t = 0
    for (name, f) in benchmarks:
        s = time(f)
        t += s
        print(name, s, "ms")
    print("Total: ", t, "ms")
