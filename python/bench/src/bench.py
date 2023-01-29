# mypy
from typing import Callable


def time(name: str, f: Callable, *args) -> int:
    from time import time as time0
    t = time0()
    try:
        f(*args)
    except:
        print("\n**WARNING: there was an error running", name, "**\n")
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
        s = time(name, f)
        t += s
        print(name, s, "ms")
    print("Total: ", t, "ms")
