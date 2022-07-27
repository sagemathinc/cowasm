from bench import register, all
from nt import gcd, xgcd, inverse_mod


def p1_normalize(N, u, v, compute_s=False):
    if N == 1:
        return [0, 0, 1]

    u = u % N
    v = v % N
    if u < 0: u = u + N
    if v < 0: v = v + N
    if u == 0:
        return [0, 1 if gcd(v, N) == 1 else 0, v]

    [g, s, t] = xgcd(u, N)
    s = s % N
    if s < 0: s = s + N
    if gcd(g, v) != 1:
        return [0, 0, 0]

    # Now g = s*u + t*N, so s is a "pseudo-inverse" of u mod N
    # Adjust s modulo N/g so it is coprime to N.
    if g != 1:
        d = N // g
        while gcd(s, N) != 1:
            s = (s + d) % N

    # Multiply [u,v] by s; then [s*u,s*v] = [g,s*v] (mod N)
    u = g
    v = (s * v) % N

    min_v = v
    min_t = 1
    if g != 1:
        Ng = N // g
        vNg = (v * Ng) % N
        t = 1
        for k in range(2, g + 1):
            v = (v + vNg) % N
            t = (t + Ng) % N
            if v < min_v and gcd(t, N) == 1:
                min_v = v
                min_t = t
    v = min_v
    if u < 0: u = u + N
    if v < 0: v = v + N
    if compute_s:
        s = inverse_mod(s * min_t, N)
    else:
        s = 0
    return [u, v, s]


def p1_normalize_many_times(n=10**5):
    s = 0
    for a in range(n):
        s += p1_normalize(46100, 39949, a)[0]
    return s


register("p1_normalize_many_times", p1_normalize_many_times)

if __name__ == '__main__':
    all('p1list')
