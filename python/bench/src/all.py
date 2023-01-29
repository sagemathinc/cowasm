import misc
import brython
import numbers
import pystone
import p1list
import nbody
import uuid_
import fib
import lambda_
import call
#import mandel
import mypyc_micro
import parse_int

from time import time
from bench import all


def run_all_benchmarks():
    t = time()
    all()
    print("=" * 20)
    print("Grand total time: ", int((time() - t) * 1000), "ms")


if __name__ == '__main__':
    run_all_benchmarks()
