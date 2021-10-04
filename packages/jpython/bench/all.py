import misc
import brython
import numbers
import bench
import pystone
import p1list
from time import time


def run_all_benchmarks():
    t = time()
    bench.all()
    print("="*20)
    print("Grand total time: ", int((time() - t) * 1000), "ms")


if __name__ == '__main__':
    run_all_benchmarks()
