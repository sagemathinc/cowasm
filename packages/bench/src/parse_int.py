from bench import register, all


def parse_int(S: str = '1' * 5*10**5, B: int = 10) -> int:
    """
    Parse string S as an integer in base B.   This is from

      https://discuss.python.org/t/int-str-conversions-broken-in-latest-python-bugfix-releases/18889/14?u=williamstein

    which is a discussion that illustrates how some security researchers and core
    Python developers view computational mathematics...

    AUTHOR: Oscar Benjamin

    NOTE: with pylang this gives the answer as Javascript float, so take that benchmark with a grain of salt.
    """
    m = len(S)
    l = list(map(int, S[::-1]))
    b, k = B, m
    while k > 1:
        last = [l[-1]] if k % 2 == 1 else []
        l = [l1 + b * l2 for l1, l2 in zip(l[::2], l[1::2])]
        l.extend(last)
        b, k = b**2, (k + 1) // 2
    [l0] = l
    return l0

register("parse_int", parse_int)

if __name__ == '__main__':
    all()