import bench

register = bench.register
all = bench.all


# JPython is really bad at these, since Javascript
# doesn't really have a notion of generic lists.
def list_times_number(n=100):
    for i in range(n):
        [0] * 100000


register('list_times_number', list_times_number)


def list_times_number2(n=1000000):
    v = [1, 2, list(range(100))]
    len(v * n)


register('list_times_number2', list_times_number2)


def list_times_number3(n=1000000):
    w = [0]
    for i in range(n):
        w * 3


register('list_times_number3', list_times_number3)

if __name__ == '__main__':
    all()