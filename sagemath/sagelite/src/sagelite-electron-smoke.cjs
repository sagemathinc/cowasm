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
    console.log("sagelite-electron-start version resources smoke");
    await python.exec(String.raw`
import sage.env
import sage.version

assert sage.version.version == sage.env.SAGE_VERSION
`);
    console.log("sagelite-electron-ok version resources smoke");
    console.log("sagelite-electron-start integer method resources smoke");
    await python.exec(String.raw`
from sage.rings.integer_ring import ZZ

assert ZZ(84).gcd(ZZ(30)) == ZZ(6)
assert ZZ(84).lcm(ZZ(30)) == ZZ(420)
assert ZZ(7) < ZZ(9)
`);
    console.log("sagelite-electron-ok integer method resources smoke");
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
    Compositions,
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
from sage.combinat.composition import Composition
from sage.combinat.composition_signed import SignedCompositions
from sage.combinat.integer_lists import IntegerListsLex
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.partition import Partition
from sage.combinat.perfect_matching import PerfectMatching, PerfectMatchings
from sage.combinat.permutation import Permutation, Permutations
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
R8 = Integers(8)
Md = FreeModule(R8, 2)
Ms = FreeModule(R8, 2, sparse=True)
assert not Md.basis_matrix().is_sparse()
assert Md == Ms
assert Ms.basis_matrix().is_sparse()
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
ZZx_flint = PolynomialRing(ZZ, 'x', implementation='FLINT')
xf = ZZx_flint.gen()
assert type(xf).__module__ == 'sage.rings.polynomial.polynomial_integer_dense_flint'
assert (xf + 1) * (xf - 1) == xf**2 - 1
assert (xf**10 - 1).factor().value() == xf**10 - 1
import sage.rings.polynomial.polynomial_integer_dense_flint
for module in [
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
assert str(pari(5)) == '5'
assert int(pari(2).Mod(101).znorder()) == 100
assert str(objtogen('2+3')) == '5'
assert factor_using_pari(ZZ(360)) == [(ZZ(2), 3), (ZZ(3), 2), (ZZ(5), 1)]
assert factor_using_pari(ZZ(2**31 - 1)) == [(ZZ(2147483647), 1)]

p = 13189065031705623239
Fq = GF(p**3, 'a')
owned_ffelt = Fq(9288).__pari__()
assert str(owned_ffelt) == '9288'
Fq_X = PolynomialRing(Fq, 'x')
ffelt_polynomial = Fq_X('x^9 + 13189065031705622723*x^7 + 13189065031705622723*x^6 + 9288*x^5 + 18576*x^4 + 13189065031705590731*x^3 + 13189065031705497851*x^2 + 13189065031705497851*x + 13189065031705581443')
ffelt_roots = [root for root, _multiplicity in ffelt_polynomial.roots()]
ffelt_reconstructed = Fq_X.one()
for root in ffelt_roots:
    ffelt_reconstructed *= Fq_X.gen() - root
assert ffelt_reconstructed == ffelt_polynomial

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
    console.log("sagelite-electron-start cyclotomic real value smoke");
    await python.exec(String.raw`
from sage.rings.polynomial.cyclotomic import cyclotomic_value
from sage.rings.real_mpfr import RealField

RR = RealField()
assert str(cyclotomic_value(30, RR('-1.0'))) == '1.00000000000000'
`);
    console.log("sagelite-electron-ok cyclotomic real value smoke");
    console.log("sagelite-electron-start real MPFR feature presence smoke");
    await python.exec(String.raw`
from sage.features.sagemath import sage__rings__real_mpfr

result = sage__rings__real_mpfr().is_present()
assert bool(result)
assert repr(result) == "FeatureTestResult('sage.rings.real_mpfr', True)"
`);
    console.log("sagelite-electron-ok real MPFR feature presence smoke");
    console.log("sagelite-electron-start integer real coercion smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField

value = Integer(3) + RealField()('4.0')
assert str(value) == '7.00000000000000'
high_precision = RealField(200)(Integer(9390823))
assert high_precision.parent().precision() == 200
assert str(high_precision) == '9.3908230000000000000000000000000000000000000000000000000000e6'
`);
    console.log("sagelite-electron-ok integer real coercion smoke");
    console.log("sagelite-electron-start integer real power smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField

value = Integer(2) ** RealField()('1.5')
assert str(value) == '2.82842712474619'
`);
    console.log("sagelite-electron-ok integer real power smoke");
    console.log("sagelite-electron-start integer real shift diagnostics smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField

shift = RealField()('2.5')
for operator, operation in [
    ('<<', lambda: Integer(1) << shift),
    ('>>', lambda: Integer(1) >> shift),
]:
    try:
        operation()
    except TypeError as err:
        assert str(err) == f'unsupported operands for {operator}: 1, 2.50000000000000'
    else:
        raise AssertionError(f'{operator} accepted a non-integral real shift')
`);
    console.log("sagelite-electron-ok integer real shift diagnostics smoke");
    console.log("sagelite-electron-start integer real square root smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.rings.complex_mpfr import ComplexNumber
from sage.rings.real_mpfr import RealNumber

value = Integer(2).sqrt(prec=10)
assert value.parent().precision() == 10
assert str(value) == '1.4'
high_precision = Integer(2).sqrt(prec=100)
assert high_precision.parent().precision() == 100
assert str(high_precision) == '1.4142135623730950488016887242'
all_high_precision = Integer(2).sqrt(prec=100, all=True)
assert [value.parent().precision() for value in all_high_precision] == [100, 100]
assert [str(value) for value in all_high_precision] == [
    '1.4142135623730950488016887242',
    '-1.4142135623730950488016887242',
]
assert type(Integer(5).sqrt(prec=53)) is RealNumber
assert type(Integer(-5).sqrt(prec=53)) is ComplexNumber
assert type(Integer(0).sqrt(prec=53)) is RealNumber
`);
    console.log("sagelite-electron-ok integer real square root smoke");
    console.log("sagelite-electron-start real parent smoke");
    await python.exec(String.raw`
from sage.rings.real_mpfr import RealField
from sage.structure.element import parent

value = RealField()('42.0')
assert parent(value) is value.parent()
assert str(parent(value)) == 'Real Field with 53 bits of precision'
`);
    console.log("sagelite-electron-ok real parent smoke");
    console.log("sagelite-electron-start integer real logarithm smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField

value = Integer(124).log(5, 100)
assert str(value) == '2.9950093311241087454822446806'
large = Integer(3) ** 100000
assert str(large.log(3, 53)) == '100000.000000000'
assert str((large + 1).log(3, 53)) == '100000.000000000'
very_high = (large + 1).log(3, 1000)
assert very_high.parent().precision() == 1000
assert very_high == 100000
assert str(large.log(RealField()('2.5'), prec=53)) == '119897.784671579'
`);
    console.log("sagelite-electron-ok integer real logarithm smoke");
    console.log("sagelite-electron-start integer exact real logarithm smoke");
    await python.exec(String.raw`
from sage.rings.integer import Integer

value = Integer(125).log(5, prec=53)
assert str(value) == '3.00000000000000'
`);
    console.log("sagelite-electron-ok integer exact real logarithm smoke");
    console.log("sagelite-electron-start rational 3x3 matrix smoke");
    await python.exec(String.raw`
from sage.all import QQ
from sage.matrix.constructor import identity_matrix, matrix

S = matrix(QQ, [[2, 1, 0], [1, 2, 1], [0, 1, 2]])
assert S.det() == QQ(4)
assert S.trace() == QQ(6)
assert S.inverse() * S == identity_matrix(QQ, 3)
assert S**2 == matrix(QQ, [[5, 4, 1], [4, 6, 4], [1, 4, 5]])
assert (S + identity_matrix(QQ, 3)).det() == QQ(21)
`);
    console.log("sagelite-electron-ok rational 3x3 matrix smoke");
    console.log("sagelite-electron-start rational matrix solve and view smoke");
    await python.exec(String.raw`
from sage.all import QQ
from sage.matrix.constructor import identity_matrix, matrix

A = matrix(QQ, [[3, 1, 2], [2, 2, 1], [1, 0, 1]])
b = matrix(QQ, 3, 1, [1, 2, 3])
x = A.solve_right(b)
assert A * x == b
row = matrix(QQ, 1, 3, [2, 0, 1])
y = A.solve_left(row)
assert y * A == row
assert A.matrix_from_rows_and_columns([0, 2], [0, 2]) == matrix(QQ, [[3, 2], [1, 1]])
assert A.delete_rows([1]) == matrix(QQ, [[3, 1, 2], [1, 0, 1]])
assert A.delete_columns([1]) == matrix(QQ, [[3, 2], [2, 1], [1, 1]])
assert A.augment(identity_matrix(QQ, 3)).ncols() == 6
assert A.stack(identity_matrix(QQ, 3)).nrows() == 6
`);
    console.log("sagelite-electron-ok rational matrix solve and view smoke");
    console.log("sagelite-electron-start matrix row-column mutation smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ
from sage.matrix.constructor import matrix

A = matrix(ZZ, [[1, 2, 3], [4, 5, 6], [7, 8, 10]])
A.swap_rows(0, 2)
assert A == matrix(ZZ, [[7, 8, 10], [4, 5, 6], [1, 2, 3]])
A.swap_columns(0, 1)
assert A == matrix(ZZ, [[8, 7, 10], [5, 4, 6], [2, 1, 3]])
A.rescale_row(1, ZZ(2))
assert list(A[1]) == [ZZ(10), ZZ(8), ZZ(12)]
A.set_row(0, [ZZ(1), ZZ(0), ZZ(1)])
assert list(A[0]) == [ZZ(1), ZZ(0), ZZ(1)]
A.set_column(2, [ZZ(3), ZZ(6), ZZ(9)])
assert A == matrix(ZZ, [[1, 0, 3], [10, 8, 6], [2, 1, 9]])
B = matrix(QQ, [[1, 2], [3, 5]])
B.add_multiple_of_row(1, 0, QQ(-3))
assert B == matrix(QQ, [[1, 2], [0, -1]])
B.rescale_col(0, QQ(2, 3))
assert B == matrix(QQ, [[QQ(2, 3), 2], [0, -1]])
B.add_multiple_of_column(1, 0, QQ(-3))
assert B == matrix(QQ, [[QQ(2, 3), 0], [0, -1]])
A.add_multiple_of_row(2, 0, ZZ(-2))
assert A == matrix(ZZ, [[1, 0, 3], [10, 8, 6], [0, 1, 3]])
A.add_multiple_of_column(1, 0, ZZ(3))
assert A == matrix(ZZ, [[1, 3, 3], [10, 38, 6], [0, 1, 3]])
C = matrix(QQ, [[1, 2, 3], [4, 5, 6]])
C.rescale_row(0, QQ(1, 2))
assert C == matrix(QQ, [[QQ(1, 2), 1, QQ(3, 2)], [4, 5, 6]])
C.rescale_col(2, QQ(2, 3))
assert C == matrix(QQ, [[QQ(1, 2), 1, 1], [4, 5, 4]])
`);
    console.log("sagelite-electron-ok matrix row-column mutation smoke");
    console.log("sagelite-electron-start combinatorics cardinality smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.combinat import polygonal_number
from sage.combinat.combination import Combinations
from sage.combinat.integer_lists.base import IntegerListsBackend
from sage.combinat.perfect_matching import PerfectMatchings
from sage.combinat.set_partition import SetPartitions
from sage.rings.real_mpfr import RealField

try:
    IntegerListsBackend(min_sum=RealField()('1.4'))
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral integer-list bound unexpectedly accepted')
try:
    polygonal_number(RealField()('3.5'), 1)
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral polygonal-number input unexpectedly accepted')
assert PerfectMatchings(6).cardinality() == 15
assert Combinations([1, 2, 3, 4], 3).cardinality() == 4
assert SetPartitions(4).cardinality() == 15
`);
    console.log("sagelite-electron-ok combinatorics cardinality smoke");
    console.log("sagelite-electron-start generic numerical approximation smoke");
    await python.exec(String.raw`
import sage.all
from sage.arith.numerical_approx import numerical_approx_generic

integer_approx = numerical_approx_generic(int(42), 20)
float_approx = numerical_approx_generic(float(4.2), 20)
assert str(integer_approx) == '42.000'
assert str(float_approx) == '4.2000'
assert integer_approx.parent().precision() == 20
assert float_approx.parent().precision() == 20
`);
    console.log("sagelite-electron-ok generic numerical approximation smoke");
    console.log("sagelite-electron-start polynomial helper smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ, PolynomialRing
from sage.arith.functions import LCM_list
from sage.structure.sequence import Sequence

R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x**3 - 2*x + 1).derivative().list() == [QQ(-2), QQ(0), QQ(3)]
assert (x**4 - 1)(QQ(2)) == QQ(15)
assert x.degree() == 1
assert ((x + 2)**4).list() == [QQ(16), QQ(32), QQ(24), QQ(8), QQ(1)]
h = x**5 - x + 1
assert h.truncate(3) == 1 - x
assert h.shift(2) == x**7 - x**3 + x**2
assert h.reverse(degree=5) == x**5 - x**4 + 1
ZZt = PolynomialRing(ZZ, 't')
t = ZZt.gen()
assert (t**4 - 1).quo_rem(t**2 - 1) == (t**2 + 1, 0)
assert (2*t + 4).lcm(2*t**2) == 2*t**3 + 4*t**2
assert LCM_list(Sequence((2*t + 4, 2*t**2, 2))) == 2*t**3 + 4*t**2
assert (2*x + 4).lcm(2*x**2) == x**3 + 2*x**2
g = t**3 + 2*t + 5
assert g.degree() == 3
assert g.leading_coefficient() == ZZ(1)
assert g.constant_coefficient() == ZZ(5)
assert ((t - 1)**4)(ZZ(3)) == ZZ(16)
h = x**4 + 2*x**2 + 1
assert h.coefficients(sparse=False) == [QQ(1), QQ(0), QQ(2), QQ(0), QQ(1)]
assert h[0] == QQ(1)
assert h[2] == QQ(2)
assert h.exponents() == [0, 2, 4]
assert h.dict() == {0: QQ(1), 2: QQ(2), 4: QQ(1)}
assert h.monomials() == [x**4, x**2, 1]
assert (x + 1).is_monic()
p = (x + 1)**5
assert p[3] == QQ(10)
assert p.truncate(4).degree() == 3
f = x**3 - 2*x + 1
assert f(x + 1) == x**3 + 3*x**2 + x
assert f.map_coefficients(lambda c: c * 2) == 2*x**3 - 4*x + 2
assert (x**2 + 2*x + 1).subs(x=QQ(3)) == QQ(16)
ZZz = PolynomialRing(ZZ, 'z')
z = ZZz.gen()
assert (z**3 - z)(z + 1) == z**3 + 3*z**2 + 2*z
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
T = PolynomialRing(QQ, ('a', 'b', 'c'))
a, b, c = T.gens()
h = (a + 2*b + 3*c + 1)**2
assert h.degree() == 2
assert h.monomial_coefficient(a*b) == QQ(4)
assert h.monomial_coefficient(b*c) == QQ(12)
assert h.subs({a: 1, b: 2, c: 3}) == QQ(225)
assert h.derivative(c).subs({a: 1, b: 2, c: 3}) == QQ(90)
assert (h - (a + 2*b + 3*c + 1)**2).is_zero()
`);
    console.log("sagelite-electron-ok polynomial helper smoke");
    console.log("sagelite-electron-start extended linear polynomial smoke");
    await python.exec(String.raw`
import sage.all
from sage.all import ZZ, QQ, PolynomialRing
from sage.matrix.constructor import matrix
from sage.modules.free_module import FreeModule

R = PolynomialRing(QQ, 'x')
x = R.gen()
f = x**4 - 3*x + 2
assert f.list() == [QQ(2), QQ(-3), QQ(0), QQ(0), QQ(1)]
assert (f + 1).degree() == 4
assert (f - x**4).list() == [QQ(2), QQ(-3)]

A = matrix(ZZ, [[1, 2, 3], [0, 1, 4], [5, 6, 0]])
assert A.det() == ZZ(1)
assert A.trace() == ZZ(2)
assert A * A == matrix(ZZ, [[16, 22, 11], [20, 25, 4], [5, 16, 39]])

M = FreeModule(ZZ, 3)
u = M([2, 4, 6])
v = M([1, 0, -1])
assert u - 2 * v == M([0, 4, 8])
assert u.dot_product(v) == ZZ(-4)
assert M.zero() == M([0, 0, 0])
assert M([1, 2, 3]).list() == [ZZ(1), ZZ(2), ZZ(3)]
assert (-M([1, -2, 3])).list() == [ZZ(-1), ZZ(2), ZZ(-3)]
V = FreeModule(QQ, 2)
assert V([QQ(1, 3), QQ(1, 6)]).denominator() == 6
`);
    console.log("sagelite-electron-ok extended linear polynomial smoke");
    console.log("sagelite-electron-start finite-field polynomial smoke");
    await python.exec(String.raw`
from sage.all import GF, PolynomialRing, ZZ, set_random_seed

S = PolynomialRing(GF(7), 't')
t = S.gen()
assert (t**3 + 2*t + 1).derivative() == 3*t**2 + 2
assert (t**2 + 1)(GF(7)(3)) == GF(7)(3)
f = t**4 - 1
q, r = (t**4 + 3*t**2 + 2).quo_rem(t**2 + 1)
assert q == t**2 + 2
assert r == 0
assert f.list() == [GF(7)(6), GF(7)(0), GF(7)(0), GF(7)(0), GF(7)(1)]
assert (t + 3)**3 == t**3 + 2*t**2 + 6*t + 6
S5 = PolynomialRing(GF(5), 'u')
u = S5.gen()
assert (u**3 + 4*u + 2)(u + 1) == u**3 + 3*u**2 + 2*u + 2
assert (u**2 + 3*u + 4).subs(u=GF(5)(2)) == GF(5)(4)
F25 = GF(25, 'a')
from sage.rings.finite_rings.finite_field_givaro import FiniteField_givaro
assert isinstance(F25, FiniteField_givaro)
F25_functor, F25_base = F25.construction()
assert F25_functor(F25_base) is F25
a = F25.gen()
F17 = GF(17)
assert F17.multiplicative_generator() == 3
assert sorted(F17(13)._nth_root_common(ZZ(4), True, 'Johnston', False)) == [3, 5, 12, 14]
F125 = GF(5**3, 'g')
g = F125.gen()
assert g.trace() == 0
assert (g**2 + g + 1).trace() == 2
from sage.rings.finite_rings.element_base import FinitePolyExtElement
F361 = GF(19**2, 'h')
h = F361.gen()
assert FinitePolyExtElement.charpoly(h**20, 'x', algorithm='matrix') == (h**20).charpoly('x')
F9_square = GF(9, 's', implementation='givaro', modulus='primitive')
s = F9_square.gen()
assert not s.is_square()
assert (s**2).is_square()
assert F9_square(0).is_square()
F19_4 = GF(19**4, 'q')
assert F19_4.random_element().parent() is F19_4
assert F19_4.random_element(prob=0) == 0
assert all(value.parent() is F19_4 for value in F19_4.some_elements())
assert GF(27, 'v').vector_space(map=False).dimension() == 3
Frob125 = F125.frobenius_endomorphism()
assert Frob125(g) == g**5
F16 = GF(2**4, 'd')
assert F16.dual_basis(basis=None, check=False) == [F16.gen()**3 + 1, F16.gen()**2, F16.gen(), 1]
from sage.rings.finite_rings.finite_field_base import FiniteField as FiniteFieldBase
for implementation in ('givaro', 'ntl'):
    F8_iter = GF(8, 'i', implementation=implementation)
    i = F8_iter.gen()
    assert list(FiniteFieldBase.__iter__(F8_iter)) == [
        F8_iter(0), F8_iter(1), i, i + 1,
        i**2, i**2 + 1, i**2 + i, i**2 + i + 1,
    ]
assert GF(997).multiplicative_generator() == 7
K25_extension = GF((5, 2), 'u')
L625_extension = K25_extension.extension(2, 'v')
assert L625_extension(K25_extension.gen()).minpoly() == K25_extension.gen().minpoly()
assert GF(3**8, 'a').subfield(4).order() == 3**4
F7_4 = GF(7**4, 'e')
e = F7_4.gen()
F7_4_basis = [
    4*e**3,
    2*e**3 + e**2 + 3*e + 5,
    3*e**3 + 5*e**2 + 4*e + 2,
    2*e**3 + 2*e**2 + 2,
]
F7_4_dual = F7_4.dual_basis(F7_4_basis, check=True)
assert all(
    (x*y).trace() == (1 if i == j else 0)
    for i, x in enumerate(F7_4_basis)
    for j, y in enumerate(F7_4_dual)
)
F7_8 = GF(7**8, 'r')
r = F7_8.gen()
F7_8_basis = [r**i for i in range(8)]
F7_8_dual = F7_8.dual_basis(F7_8_basis, check=False)
assert F7_8.dual_basis(F7_8_dual) == F7_8_basis
F49 = GF(7**2, 'a')
a49 = F49.gen()
f49 = F49.modulus()
assert str(F49['x'](f49).factor()) == '(x + a + 6) * (x + 6*a)'
F4 = GF(4)
A2 = GF(2).algebraic_closure()
prime_embedding = GF(2).embeddings(F4)
assert len(prime_embedding) == 1 and prime_embedding[0](1) == F4(1)
closure_embedding = GF(4, 'b').an_embedding(A2)
assert closure_embedding.domain() == GF(4, 'b')
assert closure_embedding.codomain() is A2
closure_embeddings = F4.embeddings(A2)
assert [str(phi(F4.gen())) for phi in closure_embeddings] == ['z2', 'z2 + 1']
set_random_seed(31337)
F1024 = GF((2, 10), 'a')
R1024 = PolynomialRing(F1024, 'x')
f1024 = R1024.random_element(degree=10)
assert f1024.roots() == [(F1024.gen()**9 + F1024.gen()**8 +
                          F1024.gen()**6 + F1024.gen()**4 +
                          F1024.gen()**2, 1)]
assert g.__pari__().type() == 't_FFELT'
assert str(g.__pari__()) == 'g'
renamed_givaro = (3*g**2 + 2*g + 4).__pari__('b')
assert renamed_givaro.type() == 't_FFELT'
assert str(renamed_givaro) == '3*b^2 + 2*b + 4'
S25 = PolynomialRing(F25, 'w')
w = S25.gen()
assert type(w).__module__ == 'sage.rings.polynomial.polynomial_zz_pex'
assert (w + a)**2 == w**2 + 2*a*w + a**2
K25 = S25.fraction_field()
try:
    F25(K25.gen())
except TypeError as error:
    assert str(error) == 'unable to coerce ' + repr(type(K25.gen()))
else:
    raise AssertionError('unsupported coercion unexpectedly succeeded')
K = GF(11**4, 'z', implementation='pari_ffelt')
z = K.gen()
p_root = z**3 + 7*z**2 + 6*z + 10
assert str(p_root) == 'z^3 + 7*z^2 + 6*z + 10'
assert p_root.__pari__().type() == 't_FFELT'
K9 = GF(9, 'a', implementation='pari_ffelt')
K9_functor, K9_base = K9.construction()
assert K9_functor(K9_base) is K9
from sage.misc.sage_unittest import TestSuite
TestSuite(K9).run()
reserved_pari_name = GF(25, 'I', implementation='pari_ffelt').gen()
try:
    reserved_pari_name.__pari__()
except ValueError as error:
    assert str(error) == 'variable name illegal in PARI'
else:
    raise AssertionError('reserved PARI finite-field name was accepted')
from sage.rings.finite_rings.hom_finite_field import FrobeniusEndomorphism_finite_field
K125 = GF(5**3, 't')
try:
    FrobeniusEndomorphism_finite_field(K125, K125.gen())
except TypeError as error:
    assert str(error) == 'n (=t) is not an integer'
else:
    raise AssertionError('finite-field Frobenius accepted a non-integer power')
from sage.rings.finite_rings.hom_finite_field import FiniteFieldHomomorphism_generic
section_domain = GF(3**7, 's')
section_codomain = GF(3**21, 'S')
embedding = FiniteFieldHomomorphism_generic(section_domain.Hom(section_codomain))
assert embedding.section()(embedding(section_domain.gen())) == section_domain.gen()
from sage.categories.homset import End
homset_field = GF(25, 'h')
h = homset_field.gen()
assert [phi(h) for phi in End(homset_field)] == [4*h + 1, h]
root_field = GF(4, 'r')
r = root_field.gen()
assert root_field(1).nth_root(0, all=True) == [r, r + 1, root_field(1)]
try:
    homset_field(0).multiplicative_order()
except ArithmeticError as error:
    assert str(error) == 'multiplicative order of 0 not defined'
else:
    raise AssertionError('zero unexpectedly had a multiplicative order')
invariant_field = GF(3**4, 'm')
invariant_element = invariant_field.gen()**20
assert str(invariant_element.charpoly('y')) == 'y^4 + 2*y^2 + 1'
assert str(invariant_element.minpoly('y')) == 'y^2 + 1'
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
rhs = matrix(F7, 2, 1, [1, 0])
assert A * A.solve_right(rhs) == rhs
lhs = matrix(F7, 1, 2, [1, 0])
assert A.solve_left(lhs) * A == lhs
assert identity_matrix(F7, 2).det() == F7(1)
assert A + identity_matrix(F7, 2) == matrix(F7, [[2, 2], [3, 5]])
assert 2 * A == matrix(F7, [[2, 4], [6, 1]])
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
assert B * M.identity_matrix() == B
assert B + M.zero() == B
assert B[0, 1] == F7(2)
assert B[1, 0] == F7(3)
assert B.list() == [F7(1), F7(2), F7(3), F7(4)]
assert B.transpose()[0, 1] == F7(3)
assert M.identity_matrix() == identity_matrix(F7, 2)
N = MatrixSpace(F7, 2, 3)
C = N([1, 2, 3, 4, 5, 6])
assert C.parent() is N
assert C.base_ring() is F7
assert C.nrows() == 2
assert C.ncols() == 3
assert C + N.zero() == C
G = matrix(F7, [[1, 2, 0], [0, 1, 3], [4, 0, 1]])
assert G.det() == F7(4)
assert G.trace() == F7(3)
assert G**2 == matrix(F7, [[1, 4, 6], [5, 1, 6], [1, 1, 1]])
assert G.charpoly()(G) == matrix(F7, 3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0])
assert G.rank() == 3
assert G.inverse() * G == identity_matrix(F7, 3)
rhs3 = matrix(F7, 3, 1, [1, 2, 3])
assert G * G.solve_right(rhs3) == rhs3
lhs3 = matrix(F7, 1, 3, [3, 2, 1])
assert G.solve_left(lhs3) * G == lhs3
`);
    console.log("sagelite-electron-ok finite-field matrix smoke");
    console.log("sagelite-electron-start matrix solve smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ
from sage.matrix.constructor import matrix, zero_matrix

A = matrix(ZZ, [[1, 2], [3, 4]])
u = matrix(ZZ, 2, 1, [1, 2])
solution = A.solve_right(u)
assert A * solution == u
v = matrix(ZZ, 1, 2, [5, 6])
left_solution = A.solve_left(v)
assert left_solution * A == v
B = matrix(ZZ, [[2, 1, 0], [1, 2, 1], [0, 1, 2]])
b = matrix(ZZ, 3, 1, [1, 2, 3])
integer_solution = B.solve_right(b)
assert B * integer_solution == b
F = matrix(ZZ, [[1, 1], [1, 0]])
assert F**5 == matrix(ZZ, [[8, 5], [5, 3]])
assert zero_matrix(ZZ, 2, 2) + F == F
stacked = F.stack(F)
assert stacked.nrows() == 4
assert stacked.ncols() == 2
augmented = F.augment(F)
assert augmented.nrows() == 2
assert augmented.ncols() == 4
assert A.transpose() == matrix(ZZ, [[1, 3], [2, 4]])
assert A.change_ring(QQ) == matrix(QQ, [[1, 2], [3, 4]])
assert A.list() == [ZZ(1), ZZ(2), ZZ(3), ZZ(4)]
assert list(A.rows()[0]) == [ZZ(1), ZZ(2)]
assert list(A.columns()[1]) == [ZZ(2), ZZ(4)]
G = matrix(ZZ, [[1, 2, 3], [4, 5, 6], [7, 8, 10]])
assert G[0, 2] == ZZ(3)
assert list(G[1]) == [ZZ(4), ZZ(5), ZZ(6)]
assert G.column(1).list() == [ZZ(2), ZZ(5), ZZ(8)]
assert G.matrix_from_rows_and_columns([0, 2], [1, 2]) == matrix(ZZ, [[2, 3], [8, 10]])
assert G.delete_rows([1]) == matrix(ZZ, [[1, 2, 3], [7, 8, 10]])
assert G.delete_columns([0]) == matrix(ZZ, [[2, 3], [5, 6], [8, 10]])
assert G.antitranspose()[0, 0] == ZZ(10)
row = matrix(ZZ, 1, 3, [3, 2, 1])
integer_left_solution = B.solve_left(row)
assert integer_left_solution * B == row
C = matrix(QQ, [[1, 2], [3, 5]])
rational_solution = C.solve_right(matrix(QQ, 2, 1, [1, 1]))
assert rational_solution == matrix(QQ, 2, 1, [-3, 2])
rational_left_solution = C.solve_left(matrix(QQ, 1, 2, [1, 1]))
assert rational_left_solution * C == matrix(QQ, 1, 2, [1, 1])
`);
    console.log("sagelite-electron-ok matrix solve smoke");
    console.log("sagelite-electron-start Laurent polynomial smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ, LaurentPolynomialRing

R = LaurentPolynomialRing(QQ, 't')
t = R.gen()
f = t**2 + 2 + t**-1
assert f * t == t**3 + 2*t + 1
assert f.degree() == 2
assert f.valuation() == -1
h = f + t**-2
assert h.valuation() == -2
g = f * t**2
assert g.exponents() == [1, 2, 4]
assert g.dict() == {1: QQ(1), 2: QQ(2), 4: QQ(1)}
assert g.coefficients() == [QQ(1), QQ(2), QQ(1)]
assert (t + t**-1)**2 == t**2 + 2 + t**-2
rational = (t + 1) / (t**2 + t + 1)
assert str(rational) == '(t + 1)/(t^2 + t + 1)'
assert rational * (t**2 + t + 1) == t + 1
M = LaurentPolynomialRing(QQ, ('x', 'y'))
x, y = M.gens()
P = M.polynomial_ring()
assert P(x**2 + x*y + 1) == P.gen(0)**2 + P.gen(0)*P.gen(1) + 1
try:
    P(x**-1 + y)
except ValueError as err:
    assert 'negative exponent' in str(err)
else:
    raise AssertionError('negative Laurent exponent unexpectedly converted to polynomial')
ML = M.localization(x + 1)
xi = ML(~x)
assert M(xi) == ~x
Z = ZZ['z']
z = Z.gen()
L = Z.localization((z**2 + 1, 7))
assert L._extra_units == (Z(7), z**2 + 1)
LF = L.fraction_field()
phi = LF.coerce_map_from(L)
assert phi(L(ZZ(1) / ZZ(7))) == ZZ(1) / ZZ(7)
P0 = ZZ['u']
u = P0.gen()
P1 = P0.fraction_field()['v']
v = P1.gen()
nested = (u / (u**2 + 1))*v + 1 / (u**3 + 1)
target = ZZ['u,v'].fraction_field()
ut, vt = target.gens()
assert target(nested) == (
    (ut**4*vt + ut**2 + ut*vt + 1) /
    (ut**5 + ut**3 + ut**2 + 1)
)
G = ZZ['a,b']
a, b = G.gens()
GK = G.fraction_field()
T = GK['w']
w = T.gen()
parameter = (a + b) / (a**2 + b + 1)
left = (parameter*w + 1)**2
right = (w + parameter)**2
assert left.gcd(right) == T.one()
assert (left*(w-a)).gcd(right*(w-a)) == w - a
from sage.all import LieAlgebras
L = LieAlgebras(QQ).example()
lx, ly = L.lie_algebra_generators()
assert 0 + lx == lx
assert sum((lx, ly)) == lx + ly
assert sum((lx, -lx)) == L.zero()
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
    console.log("sagelite-electron-start integer quotient ring extension smoke");
    await python.exec(String.raw`
from sage.all import ZZ

Q7 = ZZ.quotient(7 * ZZ)
q3 = Q7(3)
q5 = Q7(5)
assert q3 + q5 == Q7(1)
assert q3 * q5 == Q7(1)
assert q3**6 == Q7(1)
assert -q3 == Q7(4)
assert q3.lift() == ZZ(3)
assert q3 - q5 == Q7(5)
Q11 = ZZ.quotient(11 * ZZ)
q7 = Q11(7)
assert q7**10 == Q11(1)
assert (q7 + Q11(9)).lift() == ZZ(5)
`);
    console.log("sagelite-electron-ok integer quotient ring extension smoke");
    console.log("sagelite-electron-start integer and rational helper smoke");
    await python.exec(String.raw`
from sage.all import ZZ, QQ, lcm
from sage.structure.sequence import Sequence

g, s, t = ZZ(5).xgcd(ZZ(12))
assert g == ZZ(1)
assert s * ZZ(5) + t * ZZ(12) == g
assert ZZ(255).digits(16) == [15, 15]
assert ZZ(10).digits(2) == [0, 1, 0, 1]
assert ZZ(255).bits() == [1, 1, 1, 1, 1, 1, 1, 1]
assert ZZ(123456).str(16) == '1e240'
assert ZZ(12345).quo_rem(ZZ(97)) == (ZZ(127), ZZ(26))
assert ZZ(144).sqrtrem() == (ZZ(12), ZZ(0))
assert ZZ(145).sqrtrem() == (ZZ(12), ZZ(1))
assert ZZ(97).is_prime()
assert not ZZ(221).is_prime()
assert ZZ(-12345).abs() == ZZ(12345)
assert (-ZZ(12)).sign() == -1
assert ZZ(0).sign() == 0
assert ZZ(12).sign() == 1
assert ZZ(0).is_zero()
assert ZZ(1).is_one()
assert ZZ(1).is_unit()
assert ZZ(-1).is_unit()
assert not ZZ(7).is_unit()
assert ZZ(6).divides(ZZ(42))
assert not ZZ(6).divides(ZZ(43))
assert ZZ(2).powermod(10, 17) == ZZ(4)
assert ZZ(2).powermod(ZZ(20), ZZ(17)) == ZZ(16)
assert ZZ(2).inverse_mod(ZZ(5)) == ZZ(3)
assert ZZ(35).gcd(ZZ(21)) == ZZ(7)
assert ZZ(35).lcm(ZZ(21)) == ZZ(105)
assert ZZ(-17).quo_rem(ZZ(5)) == (ZZ(-4), ZZ(3))
assert lcm([ZZ(6), ZZ(10), ZZ(15)]) == ZZ(30)
assert QQ(-45, 28).abs() == QQ(45, 28)
assert QQ(-45, 28).floor() == -2
assert QQ(-45, 28).ceil() == -1
assert QQ(45, 28).floor() == 1
assert QQ(45, 28).ceil() == 2
assert QQ(7, 9).numerator() == 7
assert QQ(7, 9).denominator() == 9
assert QQ(12, 18).numerator() == 2
assert QQ(12, 18).denominator() == 3
assert QQ(0).is_zero()
assert QQ(1).is_one()
assert not QQ(2).is_one()
assert QQ(-7, 3).sign() == -1
assert QQ(0).sign() == 0
assert QQ(7, 3).sign() == 1
assert QQ(2, 3) < QQ(3, 4)
assert QQ(-5, 7) < QQ(0)
assert QQ(9, 12) == QQ(3, 4)
assert QQ(5, 6) > QQ(4, 5)
assert QQ(7, 10) * QQ(15, 14) == QQ(3, 4)
assert QQ(5, 6) / QQ(10, 9) == QQ(3, 4)
R = ZZ['x']
assert Sequence([R(2), R(3)]).universe() is R
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
assert Permutations(3).cardinality() == 6
assert Permutations(3).list() == [
    Permutation([1, 2, 3]),
    Permutation([1, 3, 2]),
    Permutation([2, 1, 3]),
    Permutation([2, 3, 1]),
    Permutation([3, 1, 2]),
    Permutation([3, 2, 1]),
]
rho = Permutation([3, 1, 2])
assert rho.order() == 3
assert rho.cycle_type() == [3]
assert Permutation([2, 3, 1]).order() == 3
`);
    console.log("sagelite-electron-ok combinatorics extension smoke");
    console.log("sagelite-electron-start lrcalc Python extension smoke");
    await python.exec(String.raw`
import lrcalc

assert lrcalc.lrcoef([2, 1], [1], [2]) == 1
`);
    console.log("sagelite-electron-ok lrcalc Python extension smoke");
    console.log("sagelite-electron-start partition and composition method smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.composition import Composition
from sage.combinat.partition import Partition

p = Partition([4, 2, 1])
assert p.conjugate().conjugate() == p
assert p.dominates(Partition([3, 3, 1]))
assert not Partition([3, 2, 2]).dominates(p)
assert Partition([3, 2]).length() == 2
p3 = Partition([5, 3, 1])
assert p3.frobenius_coordinates() == ([4, 1], [2, 0])
assert p3.to_exp() == [1, 0, 1, 0, 1]
assert p.length() == 3
assert p[0] == 4
assert p.get_part(4) == 0
comp = Composition([2, 1, 3])
assert comp.descents() == [1, 2]
assert comp.to_subset() == {2, 3}
assert comp.partial_sums() == [2, 3, 6]
`);
    console.log("sagelite-electron-ok partition and composition method smoke");
    console.log("sagelite-electron-start tableau and enumerated combinatorics smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.set_partition import SetPartitions
from sage.combinat.subset import Subsets
from sage.combinat.tableau import StandardTableaux, Tableau

assert StandardTableaux([2, 1]).list() == [
    Tableau([[1, 3], [2]]),
    Tableau([[1, 2], [3]]),
]
assert StandardTableaux([2, 2]).cardinality() == 2
assert [list(t.shape()) for t in StandardTableaux(4)[:5]] == [[4], [3, 1], [3, 1], [3, 1], [2, 2]]
assert SetPartitions(5).cardinality() == 52
assert Subsets([1, 2, 3, 4], 3).cardinality() == 4
assert IntegerVectors(5, 3).cardinality() == 21
`);
    console.log("sagelite-electron-ok tableau and enumerated combinatorics smoke");
    console.log("sagelite-electron-start set family smoke");
    await python.exec(String.raw`
import sage.all
from sage.all import RealNumber
from sage.arith.srange import ellipsis_range, srange
from sage.doctest.fixtures import reproducible_repr
from sage.sets.disjoint_set import DisjointSet
from sage.sets.family import Family
from sage.sets.integer_range import IntegerRange
from sage.sets.non_negative_integers import NonNegativeIntegers
from sage.sets.positive_integers import PositiveIntegers

F = Family([1, 2, 3], lambda i: i * i)
assert list(F) == [1, 4, 9]
assert F.cardinality() == 3
G = Family([1, 2, 3, 4], lambda i: i * i)
assert G[3] == 9
assert list(G.keys()) == [1, 2, 3, 4]
assert list(G.values()) == [1, 4, 9, 16]
H = Family([1, 2, 3, 4], lambda i: i + 10)
assert list(H.keys()) == [1, 2, 3, 4]
assert list(H.values()) == [11, 12, 13, 14]
assert H[4] == 14
N = NonNegativeIntegers()
assert 0 in N
assert 5 in N
assert -1 not in N
assert list(N.some_elements())[:4] == [0, 1, 3, 42]
P = PositiveIntegers()
assert 1 in P
assert 5 in P
assert 0 not in P
assert list(P.some_elements())[:5] == [1, 2, 3, 4, 5]
half = RealNumber('0.5')
assert srange(1, 5, half) == [1 + i * half for i in range(8)]
two_fifths = RealNumber('0.4')
assert srange(0, 1, two_fifths) == [i * two_fifths for i in range(3)]
assert ellipsis_range(1, Ellipsis, 3, step=half) == [1 + i * half for i in range(5)]
try:
    IntegerRange(RealNumber('1.0'))
except TypeError as err:
    assert str(err) == "end must be Integer or Infinity, not <class 'sage.rings.real_mpfr.RealLiteral'>"
else:
    raise AssertionError('IntegerRange should reject a RealLiteral endpoint')
try:
    DisjointSet(RealNumber('4.3'))
except TypeError as err:
    assert str(err) == "'sage.rings.real_mpfr.RealLiteral' object is not iterable"
else:
    raise AssertionError('DisjointSet should reject a non-iterable RealLiteral')
assert reproducible_repr({RealNumber('3.0'): 'three', '2': 'two', 1: 'one'}) == \
    "{'2': 'two', 1: 'one', 3.00000000000000: 'three'}"
`);
    console.log("sagelite-electron-ok set family smoke");
    console.log("sagelite-electron-start p-adic lattice pickle smoke");
    await python.exec(String.raw`
from sage.all import ZpLC
from sage.misc.persist import dumps, loads

R = ZpLC(5)
a = R(-3)
a_copy = loads(dumps(a))
assert a_copy == a
assert a_copy.parent() is R
`);
    console.log("sagelite-electron-ok p-adic lattice pickle smoke");
    console.log("sagelite-electron-start CPython static-type getattr smoke");
    await python.exec(String.raw`
from contextlib import redirect_stdout
from io import StringIO
from sage.cpython.debug import getattr_debug

with redirect_stdout(StringIO()):
    reverse = getattr_debug(list, 'reverse')
assert reverse is list.reverse
`);
    console.log("sagelite-electron-ok CPython static-type getattr smoke");
    console.log("sagelite-electron-start NTL GF2X delivery smoke");
    await python.exec(String.raw`
from sage.all import GF, PolynomialRing, pari, polygen, set_random_seed
from sage.libs.ntl import all as ntl
from sage.rings.finite_rings import element_ntl_gf2e
from sage.rings.finite_rings.finite_field_ntl_gf2e import FiniteField_ntl_gf2e

context = ntl.GF2EContext(ntl.GF2X([1, 1, 0, 1, 1, 0, 0, 0, 1]))
value = ntl.GF2E([1, 0, 1, 0, 1], context)
ntl.GF2XHexOutput(True)
assert repr(value) == '0x51'
ntl.GF2XHexOutput(False)
R = PolynomialRing(GF(2), 'x')
x = R.gen()
generic = ntl.GF2X(x**5 + x**2 + 1)
assert repr(generic) == '[1 0 1 0 0 1]'
assert generic == polygen(GF(2))**5 + polygen(GF(2))**2 + 1
extension_value = GF(2**8, 'a').gen()**20
assert repr(ntl.GF2X(extension_value)) == '[0 0 1 0 1 1 0 1]'
K = GF(2**20, 'a')
assert isinstance(K, FiniteField_ntl_gf2e)
a = K.gen()
T = PolynomialRing(K, 't')
t = T.gen()
assert repr((a + 1) * t) == '(a + 1)*t'
assert repr(K(pari('Mod(1,2)*a^20'))) == 'a^10 + a^9 + a^7 + a^6 + a^5 + a^4 + a + 1'
construction, base = K.construction()
assert construction(base) is K
assert repr(K._pari_modulus()) == 'Mod(1, 2)*a^20 + Mod(1, 2)*a^10 + Mod(1, 2)*a^9 + Mod(1, 2)*a^7 + Mod(1, 2)*a^6 + Mod(1, 2)*a^5 + Mod(1, 2)*a^4 + Mod(1, 2)*a + Mod(1, 2)'
set_random_seed(6397)
random_field = GF(2**17, 'r', modulus='random')
assert repr(random_field.modulus()) == 'x^17 + x^16 + x^15 + x^10 + x^8 + x^6 + x^4 + x^3 + x^2 + x + 1'
`);
    console.log("sagelite-electron-ok NTL GF2X delivery smoke");
    console.log("sagelite-electron-start generic linear group delivery smoke");
    await python.exec(String.raw`
from sage.all import GL, SL, ZZ, Integers
from sage.matrix.constructor import matrix

G = GL(2, Integers(6))
try:
    G(G.matrix_space().diagonal_matrix([2, 1]))
except TypeError as err:
    assert str(err) == 'matrix must be invertible'
else:
    raise AssertionError('noninvertible modular matrix was accepted')
S, T = SL(2, ZZ).gens()
assert S.matrix() == matrix(ZZ, [[0, 1], [-1, 0]])
assert T.matrix() == matrix(ZZ, [[1, 1], [0, 1]])
assert SL(2, ZZ).subgroup([T**2]).gen(0).matrix() == (T**2).matrix()
assert G.order() == len(list(G))
H = SL(2, Integers(6))
assert H.order() == len(list(H))
`);
    console.log("sagelite-electron-ok generic linear group delivery smoke");
    console.log(
      "sagelite-electron-start q-binomial Python parent delivery smoke",
    );
    await python.exec(String.raw`
from sage.combinat.q_analogues import q_binomial

r = q_binomial(3, 2, 1)
assert r == 3
assert type(r) is int
`);
    console.log(
      "sagelite-electron-ok q-binomial Python parent delivery smoke",
    );
    console.log(
      "sagelite-electron-start weak reverse plane partition shape smoke",
    );
    await python.exec(String.raw`
from sage.combinat.hillman_grassl import WeakReversePlanePartitions

S = WeakReversePlanePartitions([3, 1])
assert S is WeakReversePlanePartitions((3, 1))
assert str(S) == 'Weak Reverse Plane Partitions of shape [3, 1]'
assert [[0, 1, 2], [1]] in S
assert [[0, 1], [1]] not in S
a = S.an_element()
assert repr(a) == '[[0, 0, 0], [0]]'
assert a.parent() is S
`);
    console.log(
      "sagelite-electron-ok weak reverse plane partition shape smoke",
    );
    console.log("sagelite-electron-start integer-list envelope delivery smoke");
    await python.exec(String.raw`
from sage.combinat.integer_lists import Envelope

f = Envelope([3, 2, 2])
assert f == Envelope([3, 2, 2])
assert f == Envelope((3, 2, 2))
assert f != Envelope([3, 2, 1])
assert f != Envelope([3, 2, 2], min_part=2)
`);
    console.log("sagelite-electron-ok integer-list envelope delivery smoke");
    console.log(
      "sagelite-electron-start pairwise maximal subsets delivery smoke",
    );
    await python.exec(String.raw`
from sage.arith.misc import gcd
from sage.combinat.subsets_pairwise import PairwiseCompatibleSubsets
from sage.sets.set import Set

def predicate(x, y):
    return gcd(x, y) == 1

P = PairwiseCompatibleSubsets([4, 5, 6, 8, 9], predicate, maximal=True)
expected = {frozenset((4, 5, 9)), frozenset((5, 6)), frozenset((5, 8, 9))}
assert {frozenset(s) for s in P} == expected
assert P.cardinality() == 3
assert Set([4, 5]) not in P
assert Set([4, 5, 9]) in P
assert P != PairwiseCompatibleSubsets([4, 5, 6, 8, 9], predicate)
`);
    console.log(
      "sagelite-electron-ok pairwise maximal subsets delivery smoke",
    );
    console.log("sagelite-electron-start cyclic permutation delivery smoke");
    await python.exec(String.raw`
import sage.all
from sage.combinat.permutation import CyclicPermutations

C = CyclicPermutations([1, 2, 3, 3])
assert C.cardinality() == 3
assert C.cardinality() == len(C.list())
assert C(C.an_element()) == C.an_element()
assert all(C.rank(C.unrank(i)) == i for i in range(C.cardinality()))
assert CyclicPermutations([1, 1, 1]).cardinality() == 1
assert CyclicPermutations([]).cardinality() == 0
try:
    C((1, 2))
except ValueError:
    pass
else:
    raise AssertionError('invalid cyclic permutation unexpectedly accepted')
`);
    console.log("sagelite-electron-ok cyclic permutation delivery smoke");
    console.log("sagelite-electron-start fast vector halving delivery smoke");
    await python.exec(String.raw`
from sage.combinat.fast_vector_partitions import vector_halve

assert vector_halve([1, 2, 3, 4, 5, 6, 7, 8, 9]) == [0, 2, 3, 4, 5, 6, 7, 8, 9]
assert vector_halve([2, 4, 6, 8, 5, 6, 7, 8, 9]) == [1, 2, 3, 4, 2, 6, 7, 8, 9]
`);
    console.log("sagelite-electron-ok fast vector halving delivery smoke");
    console.log(
      "sagelite-electron-start incompatible word concatenation delivery smoke",
    );
    await python.exec(String.raw`
from sage.combinat.words.word import Word

y = Word([5, 3, 5, 8, 7])
z = Word('12223', alphabet='123')
result = z + y
assert repr(result) == 'word: 1222353587'
assert list(result) == ['1', '2', '2', '2', '3', 5, 3, 5, 8, 7]
`);
    console.log(
      "sagelite-electron-ok incompatible word concatenation delivery smoke",
    );
    console.log(
      "sagelite-electron-start category parameter refinement delivery smoke",
    );
    await python.exec(String.raw`
import sage.rings.abc
from sage.all import Algebras, Fields, GroupAlgebras, Modules, QQ, Rings, VectorSpaces, ZZ, cartesian_product
from sage.categories.bimodules import Bimodules
from sage.rings.complex_mpfr import ComplexField, ComplexField_class
from sage.rings.real_mpfr import RealField, RealField_class

assert VectorSpaces(Fields())._subcategory_hook_(Algebras(Fields().Finite())) is True
assert Modules(Rings())._subcategory_hook_(Modules(GroupAlgebras(Rings()))) is True
assert VectorSpaces(Fields())._subcategory_hook_(Algebras(QQ)) is True
assert QQ['x'] in Algebras(Fields())
assert repr(Bimodules.an_instance()) == 'Category of bimodules over Rational Field on the left and Real Field with 53 bits of precision on the right'
CC = ComplexField()
RR = RealField()
assert isinstance(RR, sage.rings.abc.RealField)
assert sage.rings.abc.RealField.__subclasses__() == [RealField_class]
assert isinstance(CC, sage.rings.abc.ComplexField)
assert sage.rings.abc.ComplexField.__subclasses__() == [ComplexField_class]
assert Bimodules(CC, ZZ).element_class is Bimodules(RR, ZZ).element_class
assert VectorSpaces(CC)._subcategory_hook_(Algebras(QQ)) is False
C = cartesian_product([ZZ, QQ, CC])
assert len(C.random_element()) == 3
A = cartesian_product([ZZ, RR])
factors = A((1, RR('1.23'))).cartesian_factors()
assert factors == (ZZ(1), RR('1.23'))
assert type(factors) is tuple
`);
    console.log(
      "sagelite-electron-ok category parameter refinement delivery smoke",
    );
    console.log(
      "sagelite-electron-start set element construction delivery smoke",
    );
    await python.exec(String.raw`
from sage.rings.integer import Integer
from sage.sets.non_negative_integers import NonNegativeIntegers
from sage.sets.set import Set

S = Set([1, 2, 3])
assert S(Integer(2)) == Integer(2)
try:
    S(Integer(4))
except ValueError as error:
    assert str(error) == '4 not in {1, 2, 3}'
else:
    raise AssertionError('nonmember construction unexpectedly succeeded')

NN = NonNegativeIntegers(facade=False)
n = NN.from_integer(Integer(5))
assert n.parent() is NN
assert type(n) is NN.element_class
`);
    console.log(
      "sagelite-electron-ok set element construction delivery smoke",
    );
    console.log(
      "sagelite-electron-start generic complex root delivery smoke",
    );
    await python.exec(String.raw`
from sage.all import ZZ, polygen
from sage.rings.polynomial.complex_roots import complex_roots

x = polygen(ZZ)
roots = complex_roots(x**5 - x - 1)
assert len(roots) == 5
assert all(multiplicity == 1 for _, multiplicity in roots)
`);
    console.log(
      "sagelite-electron-ok generic complex root delivery smoke",
    );
    console.log(
      "sagelite-electron-start WASI doctest tag introspection delivery smoke",
    );
    await python.exec(String.raw`
from sage.all import QQ
from sage.misc.sageinspect import sage_getdoc

P = QQ['x,y']
x, y = P.gens()
I = P * [x, y]
doc = sage_getdoc(I.groebner_basis)
assert doc.startswith("WARNING: the enclosing module is marked 'needs sage.libs.singular',\nso doctests may not pass.")
`);
    console.log(
      "sagelite-electron-ok WASI doctest tag introspection delivery smoke",
    );
    console.log(
      "sagelite-electron-start CPython 3.14 doc normalization smoke",
    );
    await python.exec(String.raw`
from sage.misc.sageinspect import sage_getdoc
from sage.rings.integer import Integer
from sage.sets.set_from_iterator import Decorator

def undocumented():
    pass

class Documented:
    '''
    docs
    '''

assert sage_getdoc(undocumented) == ''
assert sage_getdoc(Documented) == 'docs\n'
d = Decorator()
d.f = Integer.is_prime
doc = sage_getdoc(d)
assert doc.lstrip().startswith('Test whether "self" is prime.')
assert 'Calls the PARI' in doc
`);
    console.log(
      "sagelite-electron-ok CPython 3.14 doc normalization smoke",
    );
    console.log("sagelite-electron-start structure native delivery smoke");
    await python.exec(String.raw`
from copy import copy
from sage.all import PolynomialRing, QQ, ZZ
from sage.structure.coerce_maps import CallableConvertMap, NamedConvertMap, TryMap

named = NamedConvertMap(ZZ, QQ, '_rational_')
assert named == copy(named)
callable_map = CallableConvertMap(ZZ, QQ, lambda parent, value: QQ(value))
fallback = TryMap(callable_map, QQ.coerce_map_from(ZZ), error_types=(ValueError,))
assert callable_map == copy(callable_map)
assert fallback == copy(fallback)

R = PolynomialRing(QQ, names=('x', 'y'))
S = PolynomialRing(QQ, names=('x', 'y', 'z'))
assert R.one().gcd(R(2), algorithm='modular') == R.one()
assert R.one().gcd(S.one(), 'modular') == S.one()
`);
    console.log("sagelite-electron-ok structure native delivery smoke");
    console.log(
      "sagelite-electron-start vector-space homspace delivery smoke",
    );
    await python.exec(String.raw`
from sage.all import MatrixSpace, QQ
from sage.misc.sage_unittest import TestSuite
from sage.modules.vector_space_morphism import VectorSpaceMorphism

H = MatrixSpace(QQ, ['a', 'b'], 2)
sample = H.an_element()
assert isinstance(sample, VectorSpaceMorphism)
assert sample.is_zero()
TestSuite(H).run()
`);
    console.log(
      "sagelite-electron-ok vector-space homspace delivery smoke",
    );
    console.log(
      "sagelite-electron-start Drinfeld modular-form ring delivery smoke",
    );
    await python.exec(String.raw`
from sage.all import Frac, GF
from sage.modular.drinfeld_modform.ring import DrinfeldModularForms

A = GF(2)['T']
K = Frac(A)
T = K.gen()
M = DrinfeldModularForms(K, 3)
assert M._repr_().startswith('Ring of Drinfeld modular forms of rank 3 over Fraction Field of Univariate Polynomial Ring in T over Finite Field of size 2')
for operation in (
    lambda: M.coefficient_form(1, K(1) / (T + 1)),
    lambda: M.coefficient_forms(K(1) / T),
):
    try:
        operation()
    except ValueError as error:
        assert str(error) == 'a must be an integral element'
    else:
        raise AssertionError('non-integral coefficient input was accepted')
`);
    console.log(
      "sagelite-electron-ok Drinfeld modular-form ring delivery smoke",
    );
    console.log(
      "sagelite-electron-start generic matrix backend delivery smoke",
    );
    await python.exec(String.raw`
import sys
from sage.all import Matrix, MatrixSpace, QQ, ZZ, random_matrix
from sage.matrix.matrix_generic_dense import Matrix_generic_dense

try:
    Matrix(ZZ, sys.maxsize, sys.maxsize)
except RuntimeError as error:
    assert str(error) == 'matrix dimensions are too large'
else:
    raise AssertionError('oversized dense matrix was accepted')

for matrix, num_bound, den_bound in (
    (random_matrix(QQ, 4, 10, den_bound=10), 2, 10),
    (random_matrix(QQ, 4, 10), 2, 2),
):
    assert all(
        -num_bound <= entry.numerator() <= num_bound
        and 1 <= entry.denominator() <= den_bound
        for entry in matrix.list()
    )

A = Matrix_generic_dense(MatrixSpace(ZZ, 3), range(9))
assert A.gcd() == 1
F, B = A.frobenius_form(2)
assert A == B**(-1) * F * B
`);
    console.log(
      "sagelite-electron-ok generic matrix backend delivery smoke",
    );
    console.log(
      "sagelite-electron-start polynomial matrix quotient delivery smoke",
    );
    await python.exec(String.raw`
from sage.all import GF, PolynomialRing
from sage.matrix.constructor import matrix

R = PolynomialRing(GF(7), 'x')
x = R.gen()
B = matrix(R, [[x + 1, 0], [0, x - 1]])
A = matrix(R, [[(x + 1)**2, (x - 1)*(x + 2)]])
Q, remainder = A._right_quo_rem_solve(B)
assert Q == matrix(R, [[x + 1, x + 2]])
assert remainder.is_zero()
`);
    console.log(
      "sagelite-electron-ok polynomial matrix quotient delivery smoke",
    );
    console.log(
      "sagelite-electron-start native integer rational matrix backend smoke",
    );
    await python.exec(String.raw`
from sage.all import QQ, ZZ
from sage.matrix.constructor import identity_matrix, matrix

A = matrix(QQ, [[QQ(1)/2, QQ(1)/3], [QQ(2)/5, QQ(3)/7]])
Z = matrix(ZZ, [[1, 2], [3, 5]])
assert type(A).__module__ == 'sage.matrix.matrix_rational_dense'
assert type(Z).__module__ == 'sage.matrix.matrix_integer_dense'
assert A.det() == QQ(17)/210
assert A.det(algorithm='pari') == QQ(17)/210
assert A.inverse(algorithm='flint') * A == identity_matrix(QQ, 2)
assert A.inverse(algorithm='pari') * A == identity_matrix(QQ, 2)
assert A.inverse(algorithm='iml') * A == identity_matrix(QQ, 2)
assert A.charpoly(algorithm='generic') == A.charpoly(algorithm='flint')
assert A.minpoly(algorithm='generic') == A.minpoly(algorithm='linbox')
assert A.adjugate() * A == A.det() * identity_matrix(QQ, 2)
assert A.echelon_form(algorithm='multimodular') == A.echelon_form(algorithm='flint:multimodular')
assert Z.det() == ZZ(-1)
D = matrix(ZZ, 5, [1,2,3,4,5,4,6,3,2,1,7,9,7,5,2,1,4,6,7,8,3,2,4,6,7])
D._clear_cache()
assert D.determinant(algorithm='pari') == ZZ(-21)
D._clear_cache()
assert D._det_pari(1) == ZZ(-21)
assert D._rank_pari() == 5
assert matrix(ZZ, 3, list(range(1, 10)))._rank_pari() == 2
assert matrix(ZZ, 2, 3, [1,2,3,2,4,6])._rank_pari() == 1
assert matrix(ZZ, 0, 0)._rank_pari() == 0
S = matrix(ZZ, 3, list(range(9)))
SD, SU, SV = S.smith_form()
assert SD.diagonal() == [1, 3, 0]
assert SU * S * SV == SD
T = matrix(ZZ, 3, 2, list(range(6)))
TD, TU, TV = T.smith_form()
assert TD.diagonal() == [1, 2]
assert TU * T * TV == TD
assert S.smith_form(transformation=False) == SD
E = matrix(ZZ, [[3, 0, 1], [0, 1, 0]])
assert E.elementary_divisors() == [1, 1]
assert E.transpose().elementary_divisors() == [1, 1, 0]
for nr, nc in ((2, 0), (0, 2), (0, 0)):
    E = matrix(ZZ, nr, nc)
    ED, EU, EV = E.smith_form()
    assert EU * E * EV == ED
K_input = matrix(ZZ, [[4, 7, 9, 7, 5, 0],
                      [1, 0, 5, 8, 9, 1],
                      [0, 1, 0, 1, 9, 7],
                      [4, 7, 6, 5, 1, 4]])
K_format, K = K_input._right_kernel_matrix(algorithm='pari')
assert K_format == 'computed-pari-int'
assert K == matrix(ZZ, [[26, -31, 30, -21, -2, 10],
                        [-47, -13, 48, -14, -11, 18]])
assert K_input * K.transpose() == matrix(ZZ, 4, 2)
for nr, nc in ((18, 11), (60, 55)):
    K_format, K = matrix(ZZ, nr, nc)._right_kernel_matrix()
    assert K_format == 'computed-pari-int'
    assert K == identity_matrix(ZZ, nc)
L_input = matrix(ZZ, 4, 3, [1,2,3,2,4,6,7,0,1,-1,-2,-3])
L, L_transform = L_input.LLL(algorithm='pari', transformation=True)
assert L_transform * L_input == L
assert L[:2] == matrix(ZZ, 2, 3)
assert L_input._cache == {'rank': 2}
L_input._clear_cache()
assert L_input.LLL(algorithm='pari')[:2] == matrix(ZZ, 2, 3)
assert L_input._cache == {'rank': 2}
assert Z.charpoly(algorithm='flint') == Z.charpoly(algorithm='generic')
assert Z.charpoly(algorithm='linbox') == Z.charpoly(algorithm='generic')
F, U = Z.frobenius_form(2)
assert Z == U.inverse() * F * U
assert Z.frobenius_form() == F
assert Z.frobenius_form(1) == [Z.charpoly()]
H_input = matrix(ZZ, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9])
H_expected = matrix(ZZ, [[1, 2, 3], [0, 3, 6], [0, 0, 0]])
assert all(H_input.hermite_form(algorithm=name) == H_expected
           for name in ('pari', 'pari0', 'pari1', 'pari4'))
assert H_input._hnf_pari(3) == H_expected
assert H_input._hnf_pari(0, include_zero_rows=False) == H_expected[:2]
H_ntl_input = matrix(ZZ, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9])
try:
    H_ntl_input.hermite_form(algorithm='ntl')
except ValueError as error:
    assert str(error) == 'ntl only computes HNF for square matrices of full rank.'
else:
    raise AssertionError('rank-deficient NTL HNF must raise ValueError')
H_full_rank = matrix(ZZ, 3, [0, 2, 3, 4, 5, 6, 7, 8, 9])
assert H_full_rank.hermite_form(algorithm='ntl') == matrix(ZZ, [[1, 0, 0], [0, 1, 0], [0, 0, 3]])
`);
    console.log(
      "sagelite-electron-ok native integer rational matrix backend smoke",
    );
    console.log(
      "sagelite-electron-start quadratic form native matrix helper smoke",
    );
    await python.exec(String.raw`
from sage.all import Matrix, ZZ
from sage.quadratic_forms.extras import extend_to_primitive
from sage.quadratic_forms.quadratic_form import QuadraticForm

Z = Matrix(ZZ, 2, [1, 2, 3, 5])
assert Z.__pari__() is not None
A = Matrix(ZZ, 3, 2, range(6))
D = extend_to_primitive(A)
assert D[:, :2] == A
assert abs(D.det()) == 2
assert QuadraticForm(ZZ, 2, [1, 2, 3]).adjoint_primitive().coefficients() == [3, -2, 1]
`);
    console.log(
      "sagelite-electron-ok quadratic form native matrix helper smoke",
    );
    console.log(
      "sagelite-electron-start high-byte string literal delivery smoke",
    );
    await python.exec(String.raw`
from sage.misc.sage_input import sage_input

value = '\200\300\234'
assert value == ''.join(chr(codepoint) for codepoint in (0x80, 0xc0, 0x9c))
sage_input(value, verify=True)
`);
    console.log(
      "sagelite-electron-ok high-byte string literal delivery smoke",
    );
    console.log("sagelite-electron-start scalar-extension map parent smoke");
    await python.exec(String.raw`
from sage.all import QQ, ZZ
from sage.combinat.free_module import CombinatorialFreeModule

X = CombinatorialFreeModule(ZZ, ('x',))
Y = CombinatorialFreeModule(QQ, ('x',))
X.module_morphism(on_basis=Y.monomial, codomain=Y).register_as_coercion()
phi = Y.coerce_map_from(X)
assert phi is not None
assert phi(X.monomial('x')) == Y.monomial('x')
`);
    console.log("sagelite-electron-ok scalar-extension map parent smoke");
    console.log("sagelite-electron-start exterior differential delivery smoke");
    await python.exec(String.raw`
from sage.all import QQ, ZZ, ExteriorAlgebra
from sage.misc.persist import dumps, loads

E = ExteriorAlgebra(QQ, ['x', 'y', 'z'])
x, y, z = E.gens()
s_coeff = {(0, 1): z, (1, 2): x, (2, 0): y}
boundary = E.boundary(s_coeff)
coboundary = E.coboundary(s_coeff)
assert loads(dumps(boundary)) is boundary
assert loads(dumps(coboundary)) is coboundary
sl2_coeff = {(0, 1): z, (2, 1): -2*y, (2, 0): 2*x}
assert str(E.boundary(sl2_coeff).chain_complex(R=ZZ).homology()[1]) == 'C2 x C2'
assert str(E.coboundary(sl2_coeff).chain_complex(R=ZZ).homology()[2]) == 'C2 x C2'
`);
    console.log("sagelite-electron-ok exterior differential delivery smoke");
    console.log("sagelite-electron-start Weyl display and nested-generator smoke");
    await python.exec(String.raw`
from sage.all import QQ
from sage.algebras.weyl_algebra import DifferentialWeylAlgebra
from sage.repl.display.fancy_repr import SomeIPythonRepr
from sage.rings.infinity import infinity
from sage.rings.polynomial.infinite_polynomial_ring import InfinitePolynomialRing
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing

R = PolynomialRing(QQ, 't')
t = R.gen()
D = DifferentialWeylAlgebra(R)
t, dt = D.gens()
factors = (dt**3*t**3 + dt**2*t**4).factor_differentials()
assert SomeIPythonRepr().format_string(factors) == '{(0,): 12*t^2 + 6, (1,): 8*t^3 + 18*t, (2,): t^4 + 9*t^2, (3,): t^3}'
Rx = InfinitePolynomialRing(QQ, names=('x',))
Rxy = InfinitePolynomialRing(Rx, names=('y',))
Wxy = DifferentialWeylAlgebra(Rxy)
assert Wxy.base_ring() is Rx
assert Wxy.variable_names() == ('y', 'dy')
assert DifferentialWeylAlgebra(Rxy, n=infinity) is Wxy
`);
    console.log("sagelite-electron-ok Weyl display and nested-generator smoke");
    console.log("sagelite-electron-start real-double algebraic dependency smoke");
    await python.exec(String.raw`
from sage.all import RDF, sqrt

r = sqrt(RDF(2))
assert str(r.algebraic_dependency(5)) == 'x^2 - 2'
`);
    console.log("sagelite-electron-ok real-double algebraic dependency smoke");
    console.log("sagelite-electron-start Gosper constant homography smoke");
    await python.exec(String.raw`
from sage.rings.continued_fraction import continued_fraction
from sage.rings.continued_fraction_gosper import gosper_iterator

cf = continued_fraction(([1, 2], [3, 4]))
it = iter(gosper_iterator(6, -9, -2, 3, cf))
assert list(it) == [-3]
assert it.output_preperiod_length == 1
assert cf.apply_homography(6, -9, -2, 3).value() == -3
`);
    console.log("sagelite-electron-ok Gosper constant homography smoke");
    console.log("sagelite-electron-start symbolic function identity smoke");
    await python.exec(String.raw`
from sage.ext.fast_callable import ExpressionTreeBuilder
from sage.functions.all import ceil, cos, sin

assert sin != cos and sin != ceil and cos != ceil
assert len({sin, cos, ceil}) == 3
etb = ExpressionTreeBuilder(vars=('x',), domain=float)
x = etb.var('x')
assert str(etb.call(sin, x)) == 'sin(v_0)'
`);
    console.log("sagelite-electron-ok symbolic function identity smoke");
    console.log("sagelite-electron-start GLPK MIP delivery smoke");
    await python.exec(String.raw`
import sage.all
from sage.numerical.mip import MixedIntegerLinearProgram

p = MixedIntegerLinearProgram(maximization=True, solver='GLPK')
x = p.new_variable(binary=True)
p.set_objective(3*x[0] + 2*x[1])
p.add_constraint(2*x[0] + x[1], max=2)
assert p.solve() == 3.0
values = p.get_values(x)
assert values[0] == 1.0 and values[1] == 0.0
`);
    console.log("sagelite-electron-ok GLPK MIP delivery smoke");
    console.log("sagelite-electron-start graph convexity delivery smoke");
    await python.exec(String.raw`
from sage.all import graphs

g = graphs.PetersenGraph()
convexity = g.convexity_properties()
assert convexity.hull([1, 3]) == [1, 2, 3]
assert convexity.hull([3, 7]) == [2, 3, 7]
`);
    console.log("sagelite-electron-ok graph convexity delivery smoke");
    console.log("sagelite-electron-start nauty WASI subprocess delivery smoke");
    await python.exec(String.raw`
import signal
import subprocess

from sage.all import digraphs, graphs
from sage.features.nauty import NautyExecutable

all_graphs = list(graphs(4))
assert len(all_graphs) == 11
connected_graphs = list(graphs.nauty_geng("4 -c"))
assert len(connected_graphs) == 6
assert all(graph.order() == 4 and graph.is_connected() for graph in connected_graphs)
bipartite_graphs = list(graphs.nauty_genbg("2 2 -c"))
assert len(bipartite_graphs) == 2
assert all(graph.order() == 4 and graph.is_connected() for graph in bipartite_graphs)
large_bipartite_graph = next(graphs.nauty_genbg("1 63"))
assert large_bipartite_graph.order() == 64
assert large_bipartite_graph.is_bipartite()
ktrees = list(graphs.nauty_genktreeg("6"))
assert len(ktrees) == 5
assert all(graph.order() == 6 for graph in ktrees)
trees = list(graphs.nauty_gentreeg("10"))
assert len(trees) == 106
assert all(graph.order() == 10 and graph.is_tree() for graph in trees)
large_tree = next(graphs.nauty_gentreeg("128"))
assert large_tree.order() == 128 and large_tree.is_tree()
tournaments = list(digraphs.tournaments_nauty(5))
assert len(tournaments) == 12
assert all(graph.is_tournament() for graph in tournaments)
orientations = list(digraphs.nauty_directg(graphs.nauty_geng("-c 3")))
assert len(orientations) == 13
posets = list(digraphs.nauty_posetg("5 o"))
assert len(posets) == 63
assert all(graph.is_directed_acyclic() for graph in posets)

streaming_child = subprocess.Popen(
    [NautyExecutable("gentreeg").absolute_filename(), "128"],
    stdout=subprocess.PIPE,
)
streaming_child.terminate()
assert streaming_child.wait() == -signal.SIGTERM
streaming_child.stdout.close()
`);
    console.log("sagelite-electron-ok nauty WASI subprocess delivery smoke");
    console.log("sagelite-electron-start graph LaTeX color delivery smoke");
    await python.exec(String.raw`
from sage.all import graphs, latex

g = graphs.PathGraph(2)
g.set_latex_options(vertex_color='#ff0000', vertex_fill_color=(0.25, 0.5, 1.0), edge_color='blue')
rendered = latex(g)
assert r'\definecolor{cv0}{rgb}{1.0,0.0,0.0}' in rendered
assert r'\definecolor{cfv0}{rgb}{0.25,0.5,1.0}' in rendered
assert r'\definecolor{cv0v1}{rgb}{0.0,0.0,1.0}' in rendered
`);
    console.log("sagelite-electron-ok graph LaTeX color delivery smoke");
    console.log("sagelite-electron-ok relative resources smoke");
  } finally {
    python.terminate();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
