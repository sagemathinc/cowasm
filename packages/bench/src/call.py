from bench import register, all


# Test speed of basic function call
def basic_function_call(n=10**6):
    def cardinality(n):
        return n

    for i in range(n):
        cardinality(i)


register("basic function call", basic_function_call)


# Test speed of object __call__
def object_function_call(n=10**6):
    class IntegerRing:
        def __call__(self, n):
            return n

    ZZ = IntegerRing()
    for i in range(n):
        ZZ(i)


register("dunder __call__ function call", object_function_call)

if __name__ == '__main__':
    all()
