# Benchmark based on what is discussed here: https://news.ycombinator.com/item?id=28814141

from bench import register, all

# Want this to run on any Python without numpy.
def arange(a, b, step):
    eps = 0.00000001
    v = []
    x = a
    while x + eps < b:
        v.append(x)
        x += step
    return v


def mandelbrot_iter(c):
    z = complex(0, 0)
    for iters in range(200):
        if abs(z) >= 2:
            return iters
        z = z * z + c
    return iters


def mandelbrot(size=200):
    pix = list(range(size * size))
    xPts = arange(-1.5, 0.5, 2.0 / size)
    yPts = arange(-1, 1, 2.0 / size)

    for xx, x in enumerate(xPts):
        for yy, y in enumerate(yPts):
            pix[xx + size * yy] = mandelbrot_iter(complex(x, y))
    return pix


register('mandelbrot', mandelbrot)

# quick consistency check:
assert mandelbrot(5) == [
    2, 3, 3, 5, 4, 3, 4, 6, 199, 199, 5, 199, 199, 199, 199, 5, 199, 199, 199,
    199, 3, 4, 6, 199, 199
]

if __name__ == '__main__':
    all()
