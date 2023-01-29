# The Tests from the Brython website https://brython.info/speed_results.html

# NOTE about Brython: I tried running these exact benchmarks in Brython itself on node.js
# via the node-bridge they provide, and it was overall 25x slower than
# python, with every single benchmark seemingly equally slow.  This
# contradicts the performance claims on their website.  I also saw this when
# benchmarking early on -- where the version of Brython on their demo page
# is much faster than anything I got when testing their releases, either on
# node or in the browser.  I suspect they have a major performance regression.

from bench import register, all


def simple_assignment(n=1000000):
    for i in range(n):
        a = 1
    assert a == 1


register('simple assignment', simple_assignment)


def augmented_assignment(n=1000000):
    a = 0
    for i in range(n):
        a += 1
    assert a == n


register('augmented_assignment', augmented_assignment)


def augmented_assignment_and_list_append(n=100000):
    t = []
    i = 0
    while i < n:
        t.append(i)
        i += 1
    assert len(t) == n


register('augmented_assignment_and_list_append',
         augmented_assignment_and_list_append)


def simple_assignment_to_float(n=1000000):
    for i in range(n):
        a = 1.0
    assert a == 1.0


register('simple_assignment_to_float', simple_assignment_to_float)


def big_integers(n=10000):
    n = 60
    for i in range(n):
        2**n


register('big_integers', big_integers)


def build_dictionary(n=1000000):
    for i in range(n):
        a = {0: 0}
    assert a == {0: 0}


register('build_dictionary', build_dictionary)


def build_dictionary_2(n=100000):
    d = {}
    for i in range(n):
        d[i] = i
    assert len(d) == n


register('build_dictionary_2', build_dictionary_2)


def set_dictionary_item(n=1000000):
    a = {0: 0}
    for i in range(n):
        a[0] = i
    assert a == {0: n - 1}


register('set_dictionary_item', set_dictionary_item)


def build_set(n=1000000):
    for i in range(n):
        a = {0, 2.7, "x"}
    assert a == {0, 2.7, "x"}


register('build_set', build_set)


def build_list(n=1000000):
    for i in range(n):
        a = [1, 2, 3]
    assert a == [1, 2, 3]


register("build_list", build_list)


def set_list_item(n=1000000):
    a = [0]
    for i in range(n):
        a[0] = i
    assert a[0] == n - 1


register("set_list_item", set_list_item)


def list_slice(n=100000):
    a = [1, 2, 3]
    for i in range(n):
        a[:]
    assert a[:] == [1, 2, 3]


register("list_slice", list_slice)


def integer_addition(n=1000000):
    a, b, c = 1, 2, 3
    for i in range(1000000):
        a + b + c
    assert a + b + c == 6


register("integer_addition", integer_addition)


def string_addition(n=1000000):
    a, b, c = 'a', 'b', 'c'
    for i in range(n):
        a + b + c
    assert a + b + c == 'abc'


register("string_addition", string_addition)


def cast_int_to_string(n=100000):
    for i in range(n):
        str(i)


register("cast_int_to_string", cast_int_to_string)


def create_function_without_arguments(n=1000000):
    for i in range(n):

        def f():
            pass


register("create_function_without_arguments",
         create_function_without_arguments)


def create_function_single_positional_argument(n=1000000):
    for i in range(n):

        def f(x):
            pass


register("create_function_single_positional_argument",
         create_function_single_positional_argument)


def create_function_complex_arguments(n=1000000):
    for i in range(n):

        def f(x, y=1, *args, **kw):
            pass


register("create_function_complex_arguments",
         create_function_complex_arguments)


def function_call(n=1000000):
    def f(x):
        return x

    for i in range(n):
        f(i)

    assert f(1) == 1


register("function_call", function_call)


def function_call_complex_arguments(n=100000):
    def f(x, y=0, *args, **kw):
        return x

    for i in range(n):
        f(i, 5, 6, a=8)
    assert f(10) == 10


register("function call, complex arguments", function_call_complex_arguments)


def create_simple_class(n=10000):
    for i in range(n):

        class A:
            pass


register("create simple class", create_simple_class)


def create_class_with_init(n=10000):
    for i in range(n):

        class A:
            def __init__(self, x):
                self.x = x


register("create class with init", create_class_with_init)


def create_instance_of_simple_class(n=1000000):
    class A:
        pass

    for i in range(n):
        A()


register("create instance of simple class", create_instance_of_simple_class)


# The above timing is currently much worse in Jpython than python or pypy.
# This is because classes in Jpython are not written using ES6 classes, which
# will make this massively faster (i.e., 100x!)
def create_instance_of_simple_jsclass(n=1000000):
    class A:
        pass  # so works in pure python

    r"""%js
A = class A {
constructor() {}
__repr__() { return "I am a class"; }
}
"""
    for i in range(n):
        A()


register("create instance of simple jsclass",
         create_instance_of_simple_jsclass)


def create_instance_of_class_with_init(n=100000):
    class A:
        def __init__(self, x):
            self.x = x

    for i in range(n):
        A(i)


register("create instance of class with init",
         create_instance_of_class_with_init)


def call_instance_method(n=100000):
    class A:
        def __init__(self, x):
            self.x = x

        def f(self):
            return self.x

    a = A(1)
    for i in range(n):
        a.f()


register("call_instance_method", call_instance_method)

if __name__ == '__main__':
    all()
