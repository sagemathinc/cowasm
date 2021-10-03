# The Tests from the Brython website https://brython.info/speed_results.html


def time(f, *args):
    from time import time
    t = time()
    f(*args)
    return int((time() - t) * 1000)


benchmarks = []


def register(name, f):
    global benchmarks
    benchmarks.append((name, f))


def all():
    t = 0
    for (name, f) in benchmarks:
        s = time(f)
        t += s
        print(name, s, "ms")
    print("Total...", t, "ms")


def simple_assignment(n=1000000):
    for i in range(n):
        a = 1


register('simple assignment', simple_assignment)


def augmented_assignment(n=1000000):
    a = 0
    for i in range(n):
        a += 1


register('augmented_assignment', augmented_assignment)


def augmented_assignment_and_list_append(n=100000):
    t = []
    i = 0
    while i < n:
        t.append(i)
        i += 1


register('augmented_assignment_and_list_append',
         augmented_assignment_and_list_append)


def simple_assignment_to_float(n=1000000):
    for i in range(n):
        a = 1.0


register('simple_assignment_to_float', simple_assignment_to_float)


def big_integers(n=10000):
    n = 60
    for i in range(n):
        2**n


register('big_integers', big_integers)


def build_dictionary(n=1000000):
    for i in range(n):
        a = {0: 0}


register('build_dictionary', build_dictionary)


def build_dictionary_2(n=100000):
    d = {}
    for i in range(n):
        d[i] = i


register('build_dictionary_2', build_dictionary_2)


def set_dictionary_item(n=1000000):
    a = {0: 0}
    for i in range(n):
        a[0] = i


register('set_dictionary_item', set_dictionary_item)


def build_set(n=1000000):
    for i in range(n):
        a = {0, 2.7, "x"}


register('build_set', build_set)


def build_list(n=1000000):
    for i in range(n):
        a = [1, 2, 3]


register("build_list", build_list)


def set_list_item(n=1000000):
    a = [0]
    for i in range(n):
        a[0] = i


register("set_list_item", set_list_item)


def list_slice(n=100000):
    a = [1, 2, 3]
    for i in range(n):
        a[:]


register("list_slice", list_slice)


def integer_addition(n=1000000):
    a, b, c = 1, 2, 3
    for i in range(1000000):
        a + b + c


register("integer_addition", integer_addition)


def string_addition(n=1000000):
    a, b, c = 'a', 'b', 'c'
    for i in range(n):
        a + b + c


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
