# Selected microbenchmarks from the mypyc project.
# These are interesting little benchmarks, similar to the brython ones, but better
# See https://github.com/mypyc/mypyc-benchmarks/tree/master/microbenchmarks
# We are only doing benchmarks here that are easy to express  the
# python language, e.g., some that involve a bunch of string methods aren't really
# supported.  E.g., pylang doesn't have string % tuple yet.

from bench import register, all
from typing import Iterator, List


def is_close(x: float, y: float) -> bool:
    return 0.999999 <= x / y <= 1.000001


# pylang gets killed in this generators one:


def generators() -> None:
    n = 0
    k = 0
    for i in range(100 * 1000):
        for j in gen(k):
            n += j
        k += 1
        if k == 10:
            k = 0
    assert n == 1200000, n


def gen(n: int) -> Iterator[int]:
    for i in range(n):
        yield i


register("mypyc - generators", generators)


def str_slicing() -> None:
    a = []
    for i in range(1000):
        a.append(f'Foobar-{i}')
        a.append(f'{i} str')

    n = 0
    for i in range(1000):
        for s in a:
            n += len(s[2:-2])
            if s[:3] == 'Foo':
                n += 1
            if s[-2:] == '00':
                n += 1
    assert n == 9789000, n


register("str_slicing", str_slicing)


def ord_builtin() -> None:
    a = []
    for i in range(1000):
        a.append(f'Foobar-{i}')
        a.append(f'{i}-ab-asdfsdf-asdf')
        a.append('yeah')
    n = 0
    for i in range(50):
        for s in a:
            for j in range(len(s)):
                if 97 <= ord(s[j]) <= 122:
                    n += 1
                if is_upper_case_letter(s[j]):
                    n += 2
                if s[j] == ord('a'):
                    n += 3
    assert n == 1200000, n


def is_upper_case_letter(ch: str) -> bool:
    return 65 <= ord(ch) <= 90


register('ord_builtin', ord_builtin)


def matrix_multiply() -> None:
    """Naive matrix multiplication benchmark."""
    SIZE = 30
    SEED = 535
    import random

    def setup_matrix_mult():
        def make_matrix(w: int, h: int):
            result = []
            for i in range(h):
                result.append([random.random() for _ in range(w)])
            return result

        return make_matrix(SIZE, SIZE), make_matrix(SIZE, SIZE)

    def multiply(a, b):
        result = []
        for i in range(len(a)):
            result.append([0.0] * len(b[0]))
            for j in range(len(b[0])):
                x = 0.0
                for k in range(len(b)):
                    x += a[i][k] * b[k][j]
                result[-1][j] = x
        return result

    m, m2 = setup_matrix_mult()
    for i in range(50):
        m = multiply(m, m2)


register("matrix multiplication", matrix_multiply)


def int_to_float() -> None:
    a = [1, 4, 6, 7, 8, 9]
    x = 0.0
    for i in range(1000 * 1000):
        for n in a:
            x += float(n)
    assert x == 35000000.0, x


register('int_to_float', int_to_float)


def str_to_float() -> None:
    a = ['1', '1.234567', '44324', '23.4', '-43.44e-4']
    x = 0.0
    for i in range(1000 * 1000):
        for n in a:
            x += float(n)
    assert is_close(x, 44349630223.26009), x


register('str_to_float', str_to_float)


def float_abs() -> None:
    a = [1, -1.234567, 44324, 23.4, -43.44e-4]
    x = 0.0
    for i in range(1000 * 1000):
        for n in a:
            x += abs(n)
    assert is_close(x, 44349638911.052574), x


register("float_abs", float_abs)


def int_divmod() -> None:
    a = [1, 1235, 5434, 394879374, -34453]
    n = 0
    for i in range(1000 * 1000):
        for x in a:
            q, r = divmod(x, 23)
            n += q + r
    assert n == 17167493000000, n


register("int_divmod", int_divmod)


def int_list() -> None:
    a = list(range(200))
    b = list(reversed(a))
    c = [-1, 3, 7, 1234] * 40
    n = 0
    for i in range(4000):
        n += sum_ints(a)
        n += min_int(a)
        n += min_int(b)
        n += sum_ints(b)
        n += sum_ints(c)
        n += min_int(c)
    assert n == 358076000, n


register("int_list", int_list)


def sum_ints(a: List[int]) -> int:
    s = 0
    for x in a:
        s += x
    return s


def min_int(a: List[int]) -> int:
    minimum = a[0]
    for i in range(1, len(a)):
        x = a[i]
        if x < minimum:
            minimum = x
    return minimum


def int_bitwise_ops() -> None:
    a = []
    for i in range(1000):
        a.append(i * i * 12753 % (2**20 - 1))
    b = a[10:50]

    n = 0

    for i in range(50):
        for j in a:
            for k in b:
                j |= k
                j &= ~(j ^ k)
                x = j >> 5
                n += x
                n += x << 1
                n &= 0xffffff

    assert n == 4867360, n


register("int_bitwise_ops", int_bitwise_ops)

# We don't have arb precision yet
"""
def int_long_bitwise_ops() -> None:
    a = []
    for i in range(1000):
        a.append(i * i ** (i // 15))
    b = a[10:500:10]
    print(b)
    n = 0

    for i in range(10):
        for j in a:
            for k in b:
                j |= k
                j &= ~(j ^ k)
                if (1 << (i * 19)) & j:
                    n += 1
                n += j & 1
    print(n)
    assert n == 122000, n

register("int_long_bitwise_ops", int_long_bitwise_ops)
"""


def list_of_dicts():
    a = []
    for j in range(1000):
        d = {}
        for i in range(j % 10):
            d[f'Foobar-{j}'] = j
            d[f'{j} str'] = i
        # dict = so we get keys, values below in pylang
        a.append(dict(d))
    return a


def dict_iteration() -> None:
    a = list_of_dicts()

    n = 0
    for i in range(1000):
        for d in a:
            for k in d:
                if k == '0 str':
                    n += 1
            for k in d.keys():
                if k == '0 str':
                    n += 1
            for v in d.values():
                if v == 0:
                    n += 1
            for k, v in d.items():
                if v == 1 or k == '1 str':
                    n += 1
    assert n == 202000, n


register("dict_iteration", dict_iteration)


def dict_to_list() -> None:
    a = list_of_dicts()

    n = 0
    for i in range(100):
        for d in a:
            n += len(list(d.keys()))
            n += len(list(d.values()))
            n += len(list(d.items()))
    assert n == 540000, n


register("dict_to_list", dict_to_list)

# def dict_clear() -> None:
#     n = 0
#     for i in range(1000 * 100):
#         d = {}
#         for j in range(i % 4):
#             d[j] = 'x'
#         d.clear()
#         assert len(d) == 0

# register("dict_clear", dict_clear)


def dict_copy() -> None:
    a = list_of_dicts()

    n = 0
    for i in range(100):
        for d in a:
            d2 = d.copy()
            d3 = d2.copy()
            d4 = d3.copy()
            assert len(d4) == len(d)


register("dict_copy", dict_copy)

if __name__ == '__main__':
    all()
