def add(a: int, b: float):
    return a + b

assrt.ok(add.__annotations__)
assrt.equal(add.__annotations__['a'], int)
assrt.equal(add.__annotations__['b'], float)
assrt.equal(add.__annotations__['return'], undefined)

def sum(ls: list) -> int:
    pass

assrt.ok(not (sum.__annotations__ == undefined))
assrt.deepEqual(sum.__annotations__, {
    'ls': list,
    'return': int
})

def optional(a:int=10):
    return a

assrt.ok(not (optional.__annotations__ == undefined))
assrt.equal(optional.__annotations__.a, int)
assrt.equal(optional.__defaults__.a, 10)

def otherexpr(a:3+4) -> [1, 2]:
    pass

assrt.ok(not (otherexpr.__annotations__ == undefined))
assrt.equal(otherexpr.__annotations__['a'], 7)
assrt.deepEqual(otherexpr.__annotations__['return'], [1, 2])

def basic(x:float):
    pass

assrt.deepEqual(basic.__annotations__, {
    'x': float
})

def kwstarargs(*args:list, **kwargs:dict) -> int:
    pass

assrt.equal(kwstarargs.__annotations__['return'], int)

def nothing():
    pass

assrt.ok(nothing.__annotations__ == undefined)
assrt.throws(def():
    nothing.__annotations__['return']
)

test = def(x: int):
    pass

assrt.deepEqual(test.__annotations__, {
    'x': int
})

anonreturn = def() -> 'test':
    pass

assrt.equal(anonreturn.__annotations__['return'], 'test')

assrt.equal(def asexpr(a: int):
    a
.__annotations__['a'], int)

assrt.deepEqual(def(a: int) -> float:
    a + 10.0
.__annotations__, {
    'a': int,
    'return': float
})

class A:

    def f(self, a : int, b: 'x') -> float:
        pass

assrt.deepEqual(A.prototype.f.__annotations__, {'a':int, 'b':'x', 'return': float})
