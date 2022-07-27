# Benchmark computing uuid's

# Strangely, pypy is really bad on this benchmark compared to python-native and pylang.

from bench import register, all

from uuid import uuid4


def compute_uuids(n=10**5):
    for i in range(n):
        uuid4()


register('compute_uuids', compute_uuids)

if __name__ == '__main__':
    all()
