#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const pythonWasmModule = process.env.COWASM_PYTHON_WASM_NODE || "python-wasm";
const { asyncPython } = require(pythonWasmModule);
const {
  loadSageliteManifest,
  sagelitePythonEnv,
} = loadSageliteManifestTools();

function loadSageliteManifestTools() {
  const candidates = [
    path.join(process.cwd(), "sagelite-manifest-common.cjs"),
    path.resolve(
      __dirname,
      "../../../desktop/electron/src/sagelite-manifest-common.js",
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }
  throw new Error(
    `Sagelite Electron manifest validator not found; tried ${candidates.join(", ")}`,
  );
}

function loadPythonEnv() {
  if (process.env.PYTHONPATH) {
    return {
      PYTHONPATH: process.env.PYTHONPATH,
      COWASM_SAGELITE_RESOURCE_ROOT:
        process.env.COWASM_SAGELITE_RESOURCE_ROOT || process.cwd(),
    };
  }

  const resourceRoot = path.resolve(
    process.env.COWASM_SAGELITE_ELECTRON_RESOURCES || process.cwd(),
  );
  const manifest = loadSageliteManifest(resourceRoot);
  process.chdir(resourceRoot);
  return sagelitePythonEnv(manifest, resourceRoot);
}

async function main() {
  const env = loadPythonEnv();
  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env,
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));
  try {
    console.log("sagelite-electron-start core resources smoke");
    await python.exec(String.raw`
import sage.all
import sage.libs.flint.fmpz_poly_sage
import os
from cypari2 import Pari, PariError, objtogen
from cypari2 import _pari_runtime_probe as pari_probe
from sage.all import (
    ZZ,
    QQ,
    Integers,
    GF,
    PolynomialRing,
    binomial,
    factor,
    factorial,
    gcd,
    prime_pi,
    xgcd,
)
from sage.arith.misc import CRT, valuation
from sage.misc.flatten import flatten
from sage.misc.functional import cyclotomic_polynomial
from sage.matrix.constructor import identity_matrix, matrix
from sage.modules.free_module import FreeModule
from sage.rings.factorint_pari import factor_using_pari
from sage.groups.abelian_gps.abelian_group import AbelianGroup
from sage.monoids.free_abelian_monoid import FreeAbelianMonoid
from sage.coding.hamming_code import HammingCode
from sage.combinat.combination import Combinations
from sage.combinat.composition import Composition, Compositions
from sage.combinat.composition_signed import SignedCompositions
from sage.combinat.integer_lists import IntegerListsLex
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.partition import Partition
from sage.combinat.perfect_matching import PerfectMatching, PerfectMatchings
from sage.combinat.permutation import Permutation
from sage.combinat.set_partition import SetPartitions
from sage.combinat.subset import Subsets
from sage.combinat.tableau import StandardTableaux, Tableau

assert os.environ['COWASM_SAGELITE_RESOURCE_ROOT'] == os.getcwd()
assert ZZ(2) + ZZ(3) == ZZ(5)
g, s, t = ZZ(240).xgcd(ZZ(46))
assert g == ZZ(2)
assert s * ZZ(240) + t * ZZ(46) == g
assert gcd(ZZ(84), ZZ(126)) == ZZ(42)
g2, s2, t2 = xgcd(ZZ(240), ZZ(46))
assert g2 == ZZ(2)
assert s2 * ZZ(240) + t2 * ZZ(46) == g2
assert CRT(2, 3, 5, 7) == ZZ(17)
assert valuation(ZZ(360), 2) == 3
assert flatten([[1, [2]], 3]) == [1, 2, 3]
phi5 = cyclotomic_polynomial(5, 'x')
assert phi5.degree() == 4
assert phi5(1) == 5
assert binomial(20, 8) == ZZ(125970)
assert factorial(10) == ZZ(3628800)
assert ZZ(-42).abs() == ZZ(42)
assert ZZ(81).is_square()
assert ZZ(84).divides(ZZ(252))
assert ZZ(252).quo_rem(ZZ(84)) == (ZZ(3), ZZ(0))
assert QQ(7, 9).numerator() == 7
assert QQ(7, 9).denominator() == 9
assert QQ(3, 8) + QQ(5, 12) == QQ(19, 24)
Q7 = ZZ.quotient(7 * ZZ)
assert Q7(3) + Q7(5) == Q7(1)
assert Q7(3) * Q7(5) == Q7(1)
M = FreeModule(ZZ, 3)
v = M([1, 2, 3])
w = M([4, 5, 6])
assert v + w == M([5, 7, 9])
assert v.dot_product(w) == ZZ(32)
assert 2 * v == M([2, 4, 6])
V = FreeModule(QQ, 2)
q = V([QQ(1, 2), QQ(2, 3)])
assert q.denominator() == 6
A2x3 = AbelianGroup([2, 3])
a, b = A2x3.gens()
assert a.order() == 2
assert b.order() == 3
assert (a * b).order() == 6
A4x6 = AbelianGroup([4, 6])
c, d = A4x6.gens()
assert (c * d).order() == 12
assert (c**2 * d**3).order() == 2
assert (c**3 * d**5)**2 == c**2 * d**4
assert c**4 == A4x6.one()
assert d**6 == A4x6.one()
FAM = FreeAbelianMonoid(3, 'xyz')
xm, ym, zm = FAM.gens()
assert xm * ym * xm == xm**2 * ym
assert (xm * ym * zm).parent() is FAM
assert (xm**3 * zm**2).list() == [3, 0, 2]
p = Partition([4, 2, 1])
assert p.conjugate() == Partition([3, 2, 1, 1])
assert p.size() == 7
assert list(p) == [4, 2, 1]
assert PerfectMatchings(4).cardinality() == 3
assert PerfectMatching([2, 1, 4, 3]).number_of_crossings() == 0
assert PerfectMatching([(1, 4), (2, 3)]).is_noncrossing()
sigma = Permutation([3, 1, 2])
assert sigma.inverse() == Permutation([2, 3, 1])
assert sigma.to_cycles() == [(1, 3, 2)]
assert list(sigma) == [3, 1, 2]
assert [sorted(s) for s in Subsets([1, 2, 3], 2)] == [[1, 2], [1, 3], [2, 3]]
assert Combinations([1, 2, 3], 2).list() == [[1, 2], [1, 3], [2, 3]]
assert [list(v) for v in IntegerVectors(4, 2)] == [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]]
assert Composition([2, 1]).size() == 3
assert list(Composition([2, 1])) == [2, 1]
assert Compositions(4).cardinality() == 8
assert SignedCompositions(3).cardinality() == 18
assert [list(c) for c in SignedCompositions(2)] == [[1, 1], [1, -1], [-1, 1], [-1, -1], [2], [-2]]
IL = IntegerListsLex(4, length=3)
assert IL.cardinality() == 15
assert list(IL.first()) == [4, 0, 0]
assert list(IL.last()) == [0, 0, 4]
assert [list(v) for v in IL[:4]] == [[4, 0, 0], [3, 1, 0], [3, 0, 1], [2, 2, 0]]
T = Tableau([[1, 2], [3]])
assert T.shape() == [2, 1]
assert T.conjugate() == Tableau([[1, 3], [2]])
assert StandardTableaux(3).cardinality() == 4
assert [list(t.shape()) for t in StandardTableaux(3)] == [[3], [2, 1], [2, 1], [1, 1, 1]]
assert SetPartitions(3).cardinality() == 5
assert sorted([sorted([tuple(sorted(block)) for block in p]) for p in SetPartitions([1, 2, 3], 2)]) == [
    [(1,), (2, 3)],
    [(1, 2), (3,)],
    [(1, 3), (2,)],
]
I = ZZ.ideal(7)
assert I.gen() == ZZ(7)
Z7 = Integers(7)
assert Z7(3) + Z7(5) == Z7(1)
F7 = GF(7)
assert F7(3) * F7(5) == F7(1)
H = HammingCode(GF(2), 3)
assert H.length() == 7
assert H.dimension() == 4
assert H.minimum_distance() == 3
Z9 = Integers(9)
assert Z9(4) + Z9(8) == Z9(3)
assert Z9(2) ** 3 == Z9(8)
assert Z9(4).is_unit()
assert QQ(6, 15) == QQ(2, 5)
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
q, r = (x**3 - 1).quo_rem(x - 1)
assert r == 0
assert q == x**2 + x + 1
f = x**4 - 1
assert f.derivative() == 4*x**3
assert f(QQ(2)) == QQ(15)
ZZx = PolynomialRing(ZZ, 'x')
y = ZZx.gen()
assert (y + 2) * (y + 3) == y**2 + 5*y + 6
assert list(factor(2**31 - 1)) == [(ZZ(2147483647), 1)]
assert prime_pi(10**6) == 78498
try:
    PolynomialRing(ZZ, 'x', implementation='FLINT')
except NotImplementedError as err:
    assert 'WASI' in str(err)
else:
    raise AssertionError('explicit FLINT polynomial implementation should be rejected on WASI')
for module in [
    'sage.rings.polynomial.polynomial_integer_dense_flint',
    'sage.rings.polynomial.polynomial_rational_flint',
    'sage.rings.polynomial.polynomial_zmod_flint',
]:
    try:
        __import__(module)
    except ImportError as err:
        assert 'disabled on CoWasm WASI' in str(err)
    else:
        raise AssertionError(f'{module} should fail closed on WASI')

pari = Pari()
assert pari_probe.eval_long('2+3') == 5
assert pari_probe.eval_long('primepi(10000)') == 1229
assert pari_probe.eval_long('factorback(factor(360))') == 360
assert pari_probe.eval_long('znorder(Mod(2,101))') == 100
assert pari_probe.eval_long('polisirreducible(x^2+1)') == 1
assert pari_probe.eval_long('ellcard(ellinit([0,-1]), 5)') == 6
assert pari_probe.check_error_recovery() == 'caught=e_INV recovered=221'
assert str(pari('2+3')) == '5'
assert str(pari('primepi(10^6)')) == '78498'
assert str(pari('factorback(factor(360))')) == '360'
assert str(pari('znorder(Mod(2,101))')) == '100'
assert str(pari('polisirreducible(x^2+1)')) == '1'
assert str(pari('ellcard(ellinit([0,-1]), 5)')) == '6'
try:
    pari('1/0')
except PariError as err:
    assert 'impossible inverse' in str(err)
else:
    raise AssertionError('PARI division by zero did not raise PariError')
assert str(pari('13*17')) == '221'
for label, thunk in [
    ('non-string Pari input', lambda: pari(5)),
    ('Gen conversion', lambda: objtogen('2+3')),
]:
    try:
        thunk()
    except NotImplementedError as err:
        assert 'full Gen conversion' in str(err)
    else:
        raise AssertionError(f'{label} should fail closed on WASI')
try:
    factor_using_pari(ZZ(360))
except NotImplementedError as err:
    assert 'full Gen conversion' in str(err)
else:
    raise AssertionError('Sage PARI factorization should fail closed until full Gen conversion is ported')

A = matrix(ZZ, [[1, 2], [3, 4]])
assert A.det() == ZZ(-2)
assert A * A == matrix(ZZ, [[7, 10], [15, 22]])
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == matrix(QQ, [[1, 0], [0, 1]])
E = matrix(QQ, [[2, 1], [1, 1]])
assert E.rank() == 2
assert E.echelon_form() == matrix(QQ, [[1, 0], [0, 1]])
C = matrix(ZZ, [[2, 1], [1, 2]])
assert C.trace() == ZZ(4)
assert C.charpoly()(C) == matrix(ZZ, [[0, 0], [0, 0]])
I = identity_matrix(QQ, 3)
assert I.det() == QQ(1)
D = matrix(QQ, [[1, 2, 3], [0, 1, 4], [5, 6, 0]])
assert D.det() == QQ(1)
assert D.inverse() * D == matrix(
    QQ,
    3,
    3,
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
)
`);
    console.log("sagelite-electron-ok core resources smoke");
    console.log("sagelite-electron-start combinatorics cardinality smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.combination import Combinations
from sage.combinat.perfect_matching import PerfectMatchings
from sage.combinat.set_partition import SetPartitions

assert PerfectMatchings(6).cardinality() == 15
assert Combinations([1, 2, 3, 4], 3).cardinality() == 4
assert SetPartitions(4).cardinality() == 15
`);
    console.log("sagelite-electron-ok combinatorics cardinality smoke");
    console.log("sagelite-electron-start polynomial helper smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ, PolynomialRing

R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x**3 - 2*x + 1).derivative().list() == [QQ(-2), QQ(0), QQ(3)]
assert (x**4 - 1)(QQ(2)) == QQ(15)
ZZt = PolynomialRing(ZZ, 't')
t = ZZt.gen()
assert (t**4 - 1).quo_rem(t**2 - 1) == (t**2 + 1, 0)
S = PolynomialRing(QQ, ('x', 'y'))
x, y = S.gens()
f = (x + y + 1)**2
assert f.coefficient({x: 1, y: 1}) == QQ(2)
assert f.subs({x: 1, y: 2}) == QQ(16)
g = (x + y + 1)**3
assert g.degree() == 3
assert g.derivative(x).coefficient({x: 1, y: 1}) == QQ(6)
assert g.derivative(y).subs({x: 1, y: 2}) == QQ(48)
assert g.monomial_coefficient(x**2*y) == QQ(3)
assert (g - (x + y + 1)**3).is_zero()
`);
    console.log("sagelite-electron-ok polynomial helper smoke");
    console.log("sagelite-electron-start finite-field polynomial smoke");
    await python.exec(String.raw`
from sage.all import GF, PolynomialRing

S = PolynomialRing(GF(7), 't')
t = S.gen()
assert (t**3 + 2*t + 1).derivative() == 3*t**2 + 2
assert (t**2 + 1)(GF(7)(3)) == GF(7)(3)
`);
    console.log("sagelite-electron-ok finite-field polynomial smoke");
    console.log("sagelite-electron-start finite-field matrix smoke");
    await python.exec(String.raw`
from sage.all import GF
from sage.matrix.constructor import identity_matrix, matrix
from sage.matrix.matrix_space import MatrixSpace

F7 = GF(7)
A = matrix(F7, [[1, 2], [3, 4]])
assert A.det() == F7(5)
assert A.inverse() * A == identity_matrix(F7, 2)
assert A.trace() == F7(5)
assert A.charpoly()(A) == matrix(F7, [[0, 0], [0, 0]])
assert A.rank() == 2
assert A.echelon_form() == matrix(F7, [[1, 0], [0, 1]])
C = matrix(F7, [[1, 2], [2, 4]])
assert C.rank() == 1
M = MatrixSpace(F7, 2)
B = M([1, 2, 3, 4])
assert B.parent() is M
assert B**2 == M([0, 3, 1, 1])
assert B.transpose()[0, 1] == F7(3)
`);
    console.log("sagelite-electron-ok finite-field matrix smoke");
    console.log("sagelite-electron-start Laurent polynomial smoke");
    await python.exec(String.raw`
from sage.all import QQ, LaurentPolynomialRing

R = LaurentPolynomialRing(QQ, 't')
t = R.gen()
f = t**2 + 2 + t**-1
assert f * t == t**3 + 2*t + 1
assert f.degree() == 2
assert f.valuation() == -1
`);
    console.log("sagelite-electron-ok Laurent polynomial smoke");
    console.log("sagelite-electron-start modular arithmetic extension smoke");
    await python.exec(String.raw`
from sage.all import GF, Integers

Z7 = Integers(7)
assert Z7(3).inverse_of_unit() == Z7(5)
assert Z7(3) / Z7(5) == Z7(2)
F11 = GF(11)
assert F11(3)**5 == F11(1)
Z9 = Integers(9)
assert Z9(4).inverse_of_unit() == Z9(7)
`);
    console.log("sagelite-electron-ok modular arithmetic extension smoke");
    console.log("sagelite-electron-start integer and rational helper smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ, lcm

assert ZZ(255).digits(16) == [15, 15]
assert ZZ(10).digits(2) == [0, 1, 0, 1]
assert ZZ(12345).quo_rem(ZZ(97)) == (ZZ(127), ZZ(26))
assert ZZ(144).sqrtrem() == (ZZ(12), ZZ(0))
assert ZZ(145).sqrtrem() == (ZZ(12), ZZ(1))
assert ZZ(97).is_prime()
assert not ZZ(221).is_prime()
assert ZZ(2).powermod(10, 17) == ZZ(4)
assert ZZ(35).gcd(ZZ(21)) == ZZ(7)
assert ZZ(35).lcm(ZZ(21)) == ZZ(105)
assert lcm([ZZ(6), ZZ(10), ZZ(15)]) == ZZ(30)
assert QQ(45, 28).floor() == 1
assert QQ(45, 28).ceil() == 2
`);
    console.log("sagelite-electron-ok integer and rational helper smoke");
    console.log("sagelite-electron-start extended integer helper smoke");
    await python.exec(String.raw`
import sage.all
from sage.all import ZZ, lcm, binomial
from sage.arith.misc import CRT_list, valuation

assert lcm([ZZ(4), ZZ(6), ZZ(14)]) == ZZ(84)
assert CRT_list([2, 3, 2], [3, 5, 7]) == ZZ(23)
assert valuation(ZZ(3)**10 * ZZ(5)**2, 3) == 10
assert binomial(ZZ(-5), 3) == ZZ(-35)
`);
    console.log("sagelite-electron-ok extended integer helper smoke");
    console.log("sagelite-electron-start combinatorics extension smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.derangements import Derangements
from sage.combinat.partition import Partition, Partitions
from sage.combinat.permutation import Permutation
from sage.combinat.subword import Subwords
from sage.sets.finite_set_maps import FiniteSetMaps
from sage.combinat.tuple import Tuples, UnorderedTuples

assert Derangements([1, 2, 3]).cardinality() == 2
assert Derangements([1, 2, 3]).list() == [[2, 3, 1], [3, 1, 2]]
assert Derangements([1, 2, 3, 4]).cardinality() == 9
assert all(all(value != image for value, image in zip([1, 2, 3, 4], d)) for d in Derangements([1, 2, 3, 4]))
S = Subwords([1, 2, 3], 2)
assert S.cardinality() == 3
assert S.list() == [[1, 2], [1, 3], [2, 3]]
assert Subwords([1, 2, 3, 4]).cardinality() == 16
assert Subwords([1, 2, 3, 4], 3).list() == [[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]]
FSM = FiniteSetMaps([1, 2], [3, 4])
assert FSM.cardinality() == 4
assert [f(1) for f in FSM] == [3, 3, 4, 4]
FSM2 = FiniteSetMaps([1, 2, 3], [4, 5])
assert FSM2.cardinality() == 8
assert [f(2) for f in FSM2] == [4, 4, 5, 5, 4, 4, 5, 5]
assert Tuples([1, 2], 3).cardinality() == 8
assert Tuples([1, 2], 2).list() == [(1, 1), (2, 1), (1, 2), (2, 2)]
assert UnorderedTuples([1, 2, 3], 2).list() == [(1, 1), (1, 2), (1, 3), (2, 2), (2, 3), (3, 3)]
assert Tuples([1, 2, 3], 2).cardinality() == 9
assert UnorderedTuples([1, 2], 3).list() == [(1, 1, 1), (1, 1, 2), (1, 2, 2), (2, 2, 2)]
p = Partition([4, 2, 1])
assert Partitions(5).cardinality() == 7
assert Partitions(5).list() == [
    Partition([5]),
    Partition([4, 1]),
    Partition([3, 2]),
    Partition([3, 1, 1]),
    Partition([2, 2, 1]),
    Partition([2, 1, 1, 1]),
    Partition([1, 1, 1, 1, 1]),
]
assert Partitions(6, length=2).list() == [Partition([5, 1]), Partition([4, 2]), Partition([3, 3])]
assert p.hook_lengths() == [[6, 4, 2, 1], [3, 1], [1]]
assert p.arm_lengths() == [[3, 2, 1, 0], [1, 0], [0]]
assert p.leg_lengths() == [[2, 1, 0, 0], [1, 0], [0]]
sigma = Permutation([4, 1, 3, 2])
assert sigma.number_of_inversions() == 4
assert sigma.descents() == [1, 3]
assert sigma.signature() == 1
`);
    console.log("sagelite-electron-ok combinatorics extension smoke");
    console.log("sagelite-electron-ok relative resources smoke");
  } finally {
    python.terminate();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
