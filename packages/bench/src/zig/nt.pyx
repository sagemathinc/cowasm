
cdef extern int gcd_impl(int a, int b);

cpdef int gcd(int a, int b):
    return gcd_impl(a, b)