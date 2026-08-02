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
    console.log("sagelite-electron-start number field discriminant resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
discriminant_field = NumberField(x**3 + x**2 - 2*x + 8, 'd')
assert discriminant_field.discriminant() == -503
assert discriminant_field.disc() == -503
del discriminant_field
`);
    console.log("sagelite-electron-ok number field discriminant resources smoke");
    console.log("sagelite-electron-start number field roots of unity resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
root_field = NumberField(x**2 + 1, 'i')
assert root_field.zeta_order() == 4
assert root_field.number_of_roots_of_unity() == 4
assert root_field.primitive_root_of_unity() == root_field.gen()
assert root_field.roots_of_unity() == [root_field.gen(), -1, -root_field.gen(), 1]
del root_field
`);
    console.log("sagelite-electron-ok number field roots of unity resources smoke");
    console.log("sagelite-electron-start number field zeta coefficients resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
zeta_field = NumberField(x**2 + 1, 'a')
assert [int(value) for value in zeta_field.zeta_coefficients(10)] == [
    1, 1, 0, 1, 2, 0, 0, 1, 1, 2
]
del zeta_field
`);
    console.log("sagelite-electron-ok number field zeta coefficients resources smoke");
    console.log("sagelite-electron-start number field automorphisms resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
automorphism_field = NumberField(x**2 + 10000, 'a')
automorphisms = automorphism_field.automorphisms()
assert [morphism(automorphism_field.gen()) for morphism in automorphisms] == [
    automorphism_field.gen(), -automorphism_field.gen()
]
del automorphisms
del automorphism_field
`);
    console.log("sagelite-electron-ok number field automorphisms resources smoke");
    console.log("sagelite-electron-start number field isomorphism resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
base_field = NumberField(x**2 + 1, 'a')
isomorphic_field = NumberField(x**2 + 4, 'b')
nonisomorphic_field = NumberField(x**2 + 5, 'c')
assert base_field.is_isomorphic(isomorphic_field)
assert not base_field.is_isomorphic(nonisomorphic_field)
result, maps = base_field.is_isomorphic(isomorphic_field, True)
assert result and len(maps) == 2
del base_field, isomorphic_field, nonisomorphic_field, result, maps
`);
    console.log("sagelite-electron-ok number field isomorphism resources smoke");
    console.log("sagelite-electron-start bounded norm number field ideals resources smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ

x = PolynomialRing(QQ, 'x').gen()
bounded_ideal_field = NumberField(x**2 + 23, 'a')
bounded_ideals = bounded_ideal_field.ideals_of_bdd_norm(5)
assert list(bounded_ideals) == [1, 2, 3, 4, 5]
assert [len(bounded_ideals[n]) for n in bounded_ideals] == [1, 2, 2, 3, 0]
assert [[I.norm() for I in bounded_ideals[n]] for n in bounded_ideals] == [
    [1], [2, 2], [3, 3], [4, 4, 4], []
]
del bounded_ideal_field, bounded_ideals
`);
    console.log("sagelite-electron-ok bounded norm number field ideals resources smoke");
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
f = pari('y^2 + 6')
y = f.variable()
assert str(y) == 'y'
assert f.change_variable_name('y') is f
renamed = f.change_variable_name('x')
assert str(renamed) == 'x^2 + 6'
assert renamed is not f
assert str(f) == 'y^2 + 6'
quartic = pari('y^4 - 3*y + 7')
quartic_basis = quartic.nfbasis()
quartic_nf = pari([quartic, quartic_basis]).nfinit()
assert quartic.poldegree() > 1
assert str(quartic_basis) == '[1, y, y^2, y^3]'
assert str(quartic_nf[:4]) == '[y^4 - 3*y + 7, [0, 2], 85621, 1]'
quartic_diff = quartic_nf.nf_get_diff()
assert [[int(quartic_diff[row, column]) for column in range(4)] for row in range(4)] == [
    [85621, 66591, 35930, 14526], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
]
assert str(quartic_nf.nf_get_zk() * quartic_diff) == '[85621, y + 66591, y^2 + 35930, y^3 + y^2 + 14524]'
quartic_different_basis = quartic_nf.nf_get_zk() * quartic_diff
assert [int(value.poldegree(value.variables()[0])) if value.variables() else 0 for value in quartic_different_basis] == [0, 1, 2, 3]
assert quartic_nf.nf_get_sign() == [0, 2]
cubic = pari('y^3 - 17')
cubic_nf = pari([cubic, cubic.nfbasis()]).nfinit()
assert str(cubic_nf.nf_get_zk()) == '[1, 1/3*y^2 - 1/3*y + 1/3, y]'
assert str(cubic_nf.getattr('zk')) == '[1, 1/3*y^2 - 1/3*y + 1/3, y]'
assert cubic_nf.nf_get_sign() == [1, 1]
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
Qx = PolynomialRing(QQ, 'x')
x = Qx.gen()
quadratic_field = NumberField(x**2 + 23, 'a')
quadratic_generator = quadratic_field.gen()
quadratic_different = quadratic_field.different()
assert quadratic_different.__class__.__name__ == 'NumberFieldFractionalIdeal'
assert quadratic_different.number_field() is quadratic_field
assert quadratic_different is quadratic_field.different()
assert quadratic_different.norm() == 23
assert repr(quadratic_different) == 'Fractional ideal (a)'
quadratic_different_square = quadratic_different * quadratic_different
assert quadratic_different_square.number_field() is quadratic_field
assert quadratic_different_square.norm() == 529
assert repr(quadratic_different_square) == 'Fractional ideal (23)'
quadratic_different_quotient = quadratic_different_square / quadratic_different
assert quadratic_different_quotient.number_field() is quadratic_field
assert quadratic_different_quotient.norm() == 23
assert repr(quadratic_different_quotient) == 'Fractional ideal (a)'
assert repr(quadratic_different / quadratic_different) == 'Fractional ideal (1)'
quadratic_different_square_inverse = ~quadratic_different_square
assert quadratic_different_square_inverse.norm() == QQ(1) / 529
assert repr(quadratic_different_square_inverse) == 'Fractional ideal (1/23)'
assert repr(quadratic_different_square_inverse * quadratic_different_square) == 'Fractional ideal (1)'
quadratic_different_cube_via_pari = quadratic_field.ideal(
    quadratic_field.pari_nf().idealpow(quadratic_different, 3)
)
assert quadratic_different_cube_via_pari.number_field() is quadratic_field
assert quadratic_different_cube_via_pari.norm() == 12167
assert repr(quadratic_different_cube_via_pari) == 'Fractional ideal (23*a)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealpow(quadratic_different, 0))) == 'Fractional ideal (1)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealpow(quadratic_different, -1))) == 'Fractional ideal (1/23*a)'
quadratic_intersection = quadratic_field.ideal(
    quadratic_field.pari_nf().idealintersect(quadratic_different, quadratic_different_square)
)
assert quadratic_intersection.number_field() is quadratic_field
assert quadratic_intersection.norm() == 529
assert repr(quadratic_intersection) == 'Fractional ideal (23)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealintersect(quadratic_field.ideal(1), quadratic_different))) == 'Fractional ideal (a)'
quadratic_inverse_via_pari = quadratic_field.ideal(
    quadratic_field.pari_nf().idealinv(quadratic_different)
)
assert quadratic_inverse_via_pari.number_field() is quadratic_field
assert quadratic_inverse_via_pari.norm() == 1/23
assert repr(quadratic_inverse_via_pari) == 'Fractional ideal (1/23*a)'
assert repr(quadratic_inverse_via_pari * quadratic_different) == 'Fractional ideal (1)'
quadratic_inverse_numden = quadratic_field.pari_nf().idealnumden(quadratic_inverse_via_pari)
quadratic_inverse_numerator = quadratic_field.ideal(quadratic_inverse_numden[0])
quadratic_inverse_denominator = quadratic_field.ideal(quadratic_inverse_numden[1])
assert repr(quadratic_inverse_numerator) == 'Fractional ideal (1)'
assert repr(quadratic_inverse_denominator) == 'Fractional ideal (a)'
assert repr(quadratic_inverse_numerator / quadratic_inverse_denominator) == 'Fractional ideal (1/23*a)'
quadratic_principal_large = quadratic_field.ideal(quadratic_generator * 23**5)
quadratic_principal_reduced = quadratic_principal_large.reduce_equiv()
assert quadratic_principal_reduced.number_field() is quadratic_field
assert repr(quadratic_principal_reduced) == 'Fractional ideal (1)'
two_generator_field = NumberField(x**2 + 5, 'c')
two_generator = two_generator_field.gen()
two_generator_ideal = two_generator_field.ideal([two_generator + 2, 9])
assert two_generator_ideal.gens_two() == (9, two_generator + 2)
assert two_generator_ideal == two_generator_field.ideal(two_generator + 2)
assert two_generator_ideal != two_generator_field.ideal(3)
assert two_generator_field.ideal([
    two_generator + 5, two_generator + 8
]).gens_two() == (3, two_generator + 2)
assert two_generator_field.ideal(0).gens_two() == (0, 0)
assert two_generator_field.ideal(12).gens_two() == (12, 0)
quadratic_valuation_prime = quadratic_field.factor(23)[0][0]
assert quadratic_different_square.valuation(quadratic_valuation_prime) == 2
assert quadratic_field.ideal(1).valuation(quadratic_valuation_prime) == 0
assert repr(
    quadratic_field.ideal(0).valuation(quadratic_valuation_prime)
) == '+Infinity'
primality_field = NumberField(x**2 - 17, 'd')
assert primality_field.ideal(5).is_prime()
assert not primality_field.ideal(13).is_prime()
assert not primality_field.ideal(17).is_prime()
uniformizer_field = NumberField(x**2 + 5, 'u')
uniformizer_prime, _ = uniformizer_field.ideal(3).prime_factors()
negative_uniformizer = uniformizer_field.uniformizer(
    uniformizer_prime, 'negative'
)
assert repr(negative_uniformizer) == '1/2*u + 1/2'
assert uniformizer_field.ideal(negative_uniformizer).valuation(
    uniformizer_prime
) == 1
assert negative_uniformizer.valuation(uniformizer_prime) == 1
assert uniformizer_field(1).valuation(uniformizer_prime) == 0
assert repr(uniformizer_field(0).valuation(uniformizer_prime)) == '+Infinity'
quadratic_two_ideal = quadratic_field.ideal(2)
quadratic_three_ideal = quadratic_field.ideal(3)
assert quadratic_field.pari_nf().idealispower(quadratic_two_ideal, 3) == 0
assert quadratic_field.pari_nf().idealispower(quadratic_two_ideal**3, 3) == 1
quadratic_one_mod_three = quadratic_two_ideal.element_1_mod(quadratic_three_ideal)
assert quadratic_one_mod_three == -2
assert quadratic_one_mod_three in quadratic_two_ideal
assert 1 - quadratic_one_mod_three in quadratic_three_ideal
quadratic_non_coprime_ideal = quadratic_field.ideal(quadratic_generator + 1)
quadratic_coprime_multiplier = quadratic_non_coprime_ideal.idealcoprime(
    quadratic_three_ideal
)
assert quadratic_coprime_multiplier in (
    -QQ(1)/6 * quadratic_generator + QQ(1)/6,
    QQ(1)/6 * quadratic_generator - QQ(1)/6,
)
assert (quadratic_coprime_multiplier * quadratic_non_coprime_ideal).is_coprime(
    quadratic_three_ideal
)
quadratic_crt = quadratic_field.idealchinese(
    [quadratic_field.ideal(5), quadratic_field.ideal(7)],
    [quadratic_generator, 1],
)
assert quadratic_crt == QQ(7)/2 * quadratic_generator - QQ(5)/2
assert quadratic_crt - quadratic_generator in quadratic_field.ideal(5)
assert quadratic_crt - 1 in quadratic_field.ideal(7)
assert quadratic_field.disc() == -23
other_quadratic_field = NumberField(x**2 - 123, 'b')
assert other_quadratic_field.different().norm() == 492
assert repr(other_quadratic_field.different()) == 'Fractional ideal (2*b)'
assert (other_quadratic_field.different()**2).norm() == 242064
assert repr(other_quadratic_field.different()**2) == 'Fractional ideal (492)'
other_quadratic_quotient = (other_quadratic_field.different()**2) / other_quadratic_field.different()
assert other_quadratic_quotient.number_field() is other_quadratic_field
assert other_quadratic_quotient.norm() == 492
assert repr(other_quadratic_quotient) == 'Fractional ideal (2*b)'
other_quadratic_square_inverse = ~(other_quadratic_field.different()**2)
assert other_quadratic_square_inverse.norm() == QQ(1) / 242064
assert repr(other_quadratic_square_inverse) == 'Fractional ideal (1/492)'
other_quadratic_cube_via_pari = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealpow(other_quadratic_field.different(), 3)
)
assert other_quadratic_cube_via_pari.number_field() is other_quadratic_field
assert other_quadratic_cube_via_pari.norm() == 119095488
assert repr(other_quadratic_cube_via_pari) == 'Fractional ideal (984*b)'
assert repr(other_quadratic_field.ideal(other_quadratic_field.pari_nf().idealpow(other_quadratic_field.different(), -1))) == 'Fractional ideal (1/246*b)'
other_quadratic_intersection = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealintersect(
        other_quadratic_field.different(), other_quadratic_field.different()**2
    )
)
assert other_quadratic_intersection.number_field() is other_quadratic_field
assert other_quadratic_intersection.norm() == 242064
assert repr(other_quadratic_intersection) == 'Fractional ideal (492)'
assert repr(other_quadratic_field.ideal(other_quadratic_field.pari_nf().idealintersect(other_quadratic_field.ideal(1), other_quadratic_field.different()))) == 'Fractional ideal (2*b)'
other_quadratic_inverse_via_pari = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealinv(other_quadratic_field.different())
)
assert other_quadratic_inverse_via_pari.number_field() is other_quadratic_field
assert other_quadratic_inverse_via_pari.norm() == 1/492
assert repr(other_quadratic_inverse_via_pari) == 'Fractional ideal (1/246*b)'
assert repr(other_quadratic_inverse_via_pari * other_quadratic_field.different()) == 'Fractional ideal (1)'
other_quadratic_inverse_numden = other_quadratic_field.pari_nf().idealnumden(other_quadratic_inverse_via_pari)
other_quadratic_inverse_numerator = other_quadratic_field.ideal(other_quadratic_inverse_numden[0])
other_quadratic_inverse_denominator = other_quadratic_field.ideal(other_quadratic_inverse_numden[1])
assert repr(other_quadratic_inverse_numerator) == 'Fractional ideal (1)'
assert repr(other_quadratic_inverse_denominator) == 'Fractional ideal (2*b)'
assert repr(other_quadratic_inverse_numerator / other_quadratic_inverse_denominator) == 'Fractional ideal (1/246*b)'
assert other_quadratic_field.disc() == 492
alpha = (y / 6).Mod(f)
assert str(alpha) == 'Mod(1/6*y, y^2 + 6)'
assert str(alpha.modreverse()) == 'Mod(6*y, y^2 + 1/6)'
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
    console.log("sagelite-electron-start p-adic subspace and minimal polynomial smoke");
    await python.exec(String.raw`
from sage.all import O, PolynomialRing, Qp, QqCR, VectorSpace, ZZ

V = VectorSpace(Qp(5), 2)
W = V.span([[1, 0]])
assert V([1, 0]) in W
assert V([0, 1]) not in W
assert V([O(5**5), 1]) not in W
R = PolynomialRing(Qp(5), 't')
t = R.gen()
f = 5 + 3*t + t**4 + 25*t**10
g = f._factor_of_degree(4)
assert (f % g).is_zero()
try:
    f._factor_of_degree(3)
except Exception as error:
    assert type(error).__name__ == 'PrecisionError'
    assert str(error) == 'cannot divide by something indistinguishable from zero'
else:
    raise AssertionError('invalid p-adic factor degree did not fail')
K = QqCR(ZZ(2)**3, 5, names='a')
a = K.gen()
S = PolynomialRing(K, 'x')
x = S.gen()
L = K.extension(x**4 - 2*a, names='pi')
pi = L.gen()
assert str(pi.minimal_polynomial()) == \
    '(1 + O(2^5))*x^4 + a*2 + a*2^2 + a*2^3 + a*2^4 + a*2^5 + O(2^6)'
`);
    console.log("sagelite-electron-ok p-adic subspace and minimal polynomial smoke");
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
    console.log("sagelite-electron-start real field morphism smoke");
    await python.exec(String.raw`
from sage.rings.real_mpfr import RealField

R53 = RealField()
R200 = RealField(200)
try:
    R53.hom(R200)
except TypeError as err:
    assert str(err) == (
        'natural coercion morphism from Real Field with 53 bits of precision '
        'to Real Field with 200 bits of precision not defined'
    )
else:
    raise AssertionError('unexpected real-field precision-raising morphism')
lower = R53.hom(RealField(15))
assert str(lower(R53('2.5'))) == '2.500'
assert str(lower(R53.pi())) == '3.142'
`);
    console.log("sagelite-electron-ok real field morphism smoke");
    console.log("sagelite-electron-start real preparse literals smoke");
    await python.exec(String.raw`
from sage.all import RealNumber, ellipsis_range
from sage.repl.preparse import preparse

namespace = {
    'Ellipsis': Ellipsis,
    'RealNumber': RealNumber,
    'ellipsis_range': ellipsis_range,
}
sqrt_value = eval(preparse('15.10.sqrt()'), namespace)
assert str(sqrt_value) == '3.88587184554509'
range_value = eval(preparse('[1.0..2.0]'), namespace)
assert [str(value) for value in range_value] == [
    '1.00000000000000',
    '2.00000000000000',
]
`);
    console.log("sagelite-electron-ok real preparse literals smoke");
    console.log("sagelite-electron-start real literal rename diagnostic smoke");
    await python.exec(String.raw`
from sage.all import RealNumber
from sage.repl.preparse import preparse
from sage.rings.real_mpfr import RealLiteral

literal = eval(preparse('3.14'), {'RealNumber': RealNumber})
assert type(literal) is RealLiteral
try:
    literal.rename('pi')
except NotImplementedError as err:
    assert str(err) == 'object does not support renaming: 3.14000000000000'
else:
    raise AssertionError('real literal unexpectedly supported renaming')
`);
    console.log("sagelite-electron-ok real literal rename diagnostic smoke");
    console.log("sagelite-electron-start spike function real epsilon smoke");
    await python.exec(String.raw`
from sage.all import Integer, RealNumber
from sage.functions.spike_function import spike_function
from sage.repl.preparse import preparse

namespace = {
    'Integer': Integer,
    'RealNumber': RealNumber,
    'spike_function': spike_function,
}
spike = eval(
    preparse('spike_function([(-3,4), (-1,1), (2,3)], 0.001)'),
    namespace,
)
assert str(spike.eps) == '0.00100000000000000'
`);
    console.log("sagelite-electron-ok spike function real epsilon smoke");
    console.log("sagelite-electron-start real field object module lookup smoke");
    await python.exec(String.raw`
from sage.all import RR
from sage.misc.sageinspect import find_object_modules

assert find_object_modules(RR(0).parent()) == {
    'sage.rings.real_mpfr': ['RR'],
}
`);
    console.log("sagelite-electron-ok real field object module lookup smoke");
    console.log("sagelite-electron-start immutable real matrix copy smoke");
    await python.exec(String.raw`
from copy import copy
from sage.all import Integer, RR, RealNumber, matrix
from sage.repl.preparse import preparse

real_field = RR(0).parent()
namespace = {
    'Integer': Integer,
    'RR': real_field,
    'RealNumber': RealNumber,
    'matrix': matrix,
}
A = eval(preparse('matrix(RR,2,[1,10,3.5,2])'), namespace)
A.set_immutable()
B = copy(A)
assert B is not A
assert B == A
assert B.is_mutable()
`);
    console.log("sagelite-electron-ok immutable real matrix copy smoke");
    console.log("sagelite-electron-start frieze real field change-ring smoke");
    await python.exec(String.raw`
from sage.combinat.path_tableaux.frieze import FriezePattern
from sage.rings.real_mpfr import RealField

frieze = FriezePattern([1, 2, 7, 5, 3, 7, 4, 1]).change_ring(RealField())
assert repr(frieze) == (
    '[0.000000000000000, 1.00000000000000, 2.00000000000000, '
    '7.00000000000000, 5.00000000000000, 3.00000000000000, '
    '7.00000000000000, 4.00000000000000, 1.00000000000000, '
    '0.000000000000000]'
)
assert frieze.parent().base_ring() is frieze[0].parent()
`);
    console.log("sagelite-electron-ok frieze real field change-ring smoke");
    console.log("sagelite-electron-start weak dictionary complex-field copy smoke");
    await python.exec(String.raw`
from copy import copy
from sage.all import CC, QQ, ZZ
from sage.misc.weak_dict import WeakValueDictionary

complex_field = CC(0).parent()
D = WeakValueDictionary()
D[1] = QQ
D[2] = ZZ
D[None] = complex_field
E = copy(D)
assert E is not D
assert set(E.items()) == set(D.items())
assert E[None] is complex_field
`);
    console.log("sagelite-electron-ok weak dictionary complex-field copy smoke");
    console.log("sagelite-electron-start formal sums over real fields smoke");
    await python.exec(String.raw`
from sage.all import Integer, RR
from sage.misc.latex import latex
from sage.repl.preparse import preparse
from sage.structure.formal_sum import FormalSum, FormalSums

formal_sum = eval(
    preparse('FormalSum([(1,2), (5, 8/9), (-3, 7)])'),
    {
        'FormalSum': FormalSum,
        'Integer': Integer,
    },
)
assert latex(formal_sum) == r'2 + 5\cdot \frac{8}{9} - 3\cdot 7'
real_field = RR(0).parent()
action = FormalSums(real_field).get_action(real_field)
assert repr(action) == (
    'Right scalar multiplication by Real Field with 53 bits of precision '
    'on Abelian Group of all Formal Finite Sums over Real Field with 53 bits of precision'
)
`);
    console.log("sagelite-electron-ok formal sums over real fields smoke");
    console.log("sagelite-electron-start spectrum over real field smoke");
    await python.exec(String.raw`
from sage.all import RR
from sage.schemes.generic.spec import SpecFunctor

real_field = RR(0).parent()
spectrum = SpecFunctor()(real_field)
assert repr(spectrum) == 'Spectrum of Real Field with 53 bits of precision'
`);
    console.log("sagelite-electron-ok spectrum over real field smoke");
    console.log("sagelite-electron-start affine real point-set smoke");
    await python.exec(String.raw`
from sage.all import QQ, RR
from sage.schemes.affine.affine_space import AffineSpace

real_field = RR(0).parent()
plane = AffineSpace(2, QQ)
points = plane(real_field)
assert repr(points) == (
    'Set of rational points of Affine Space of dimension 2 '
    'over Real Field with 53 bits of precision'
)
`);
    console.log("sagelite-electron-ok affine real point-set smoke");
    console.log("sagelite-electron-start affine complex plane smoke");
    await python.exec(String.raw`
from sage.all import CC
from sage.schemes.affine.affine_space import AffineSpace

complex_field = CC(0).parent()
plane = AffineSpace(complex_field, 2, names=('x', 'y'))
assert repr(plane) == (
    'Affine Space of dimension 2 over Complex Field with 53 bits of precision'
)
assert tuple(map(str, plane.gens())) == ('x', 'y')
assert plane.base_ring() is complex_field
`);
    console.log("sagelite-electron-ok affine complex plane smoke");
    console.log("sagelite-electron-start product projective complex space smoke");
    await python.exec(String.raw`
from sage.all import CC
from sage.schemes.product_projective.space import ProductProjectiveSpaces

complex_field = CC(0).parent()
space = ProductProjectiveSpaces([1, 2], complex_field, 'z')
assert repr(space) == (
    'Product of projective spaces P^1 x P^2 '
    'over Complex Field with 53 bits of precision'
)
assert tuple(map(str, space.gens())) == ('z0', 'z1', 'z2', 'z3', 'z4')
assert tuple(space.dimension_relative_components()) == (1, 2)
assert space.base_ring() is complex_field
`);
    console.log("sagelite-electron-ok product projective complex space smoke");
    console.log("sagelite-electron-start complex Laurent series pickle smoke");
    await python.exec(String.raw`
from sage.all import CC
from sage.misc.persist import loads
from sage.rings.laurent_series_ring import LaurentSeriesRing

complex_field = CC(0).parent()
ring = LaurentSeriesRing(complex_field, 'q')
assert repr(ring) == (
    'Laurent Series Ring in q over Complex Field with 53 bits of precision'
)
assert repr(ring.gen()) == '1.00000000000000*q'
assert ring.base_ring() is complex_field
assert loads(ring.dumps()) == ring
`);
    console.log("sagelite-electron-ok complex Laurent series pickle smoke");
    console.log("sagelite-electron-start complex power series pickle smoke");
    await python.exec(String.raw`
from sage.all import CC, PowerSeriesRing
from sage.misc.persist import loads

complex_field = CC(0).parent()
ring = PowerSeriesRing(complex_field, 'q')
generator = ring.gen()
assert repr(ring) == (
    'Power Series Ring in q over Complex Field with 53 bits of precision'
)
assert generator.parent() is ring
assert ring.base_ring() is complex_field
assert loads(generator.dumps()) == generator
`);
    console.log("sagelite-electron-ok complex power series pickle smoke");
    console.log(
      "sagelite-electron-start multivariate power series real base extension smoke",
    );
    await python.exec(String.raw`
from sage.all import PowerSeriesRing, QQ, RR

real_field = RR(0).parent()
ring = PowerSeriesRing(QQ, names=('t', 'u', 'v'))
extended = ring.base_extend(real_field)
assert repr(ring) == (
    'Multivariate Power Series Ring in t, u, v over Rational Field'
)
assert repr(extended) == (
    'Multivariate Power Series Ring in t, u, v '
    'over Real Field with 53 bits of precision'
)
assert extended.base_ring() is real_field
assert tuple(map(str, extended.gens())) == ('t', 'u', 'v')
`);
    console.log(
      "sagelite-electron-ok multivariate power series real base extension smoke",
    );
    console.log("sagelite-electron-start real-field map slot restoration smoke");
    await python.exec(String.raw`
from sage.all import QQ, RR, ZZ
from sage.categories.homset import Hom
from sage.categories.map import Map
from sage.categories.rings import Rings

real_field = RR(0).parent()
f = Map(Hom(QQ, ZZ, Rings()))
f._update_slots_test({'_domain': real_field, '_codomain': QQ})
assert f.domain() is real_field
assert f.codomain() is QQ
assert f._repr_type_str is None
f._update_slots_test({
    '_repr_type_str': 'restored-map',
    '_domain': real_field,
    '_codomain': QQ,
})
assert f._repr_type_str == 'restored-map'
assert f.domain() is real_field
assert f.codomain() is QQ
`);
    console.log("sagelite-electron-ok real-field map slot restoration smoke");
    console.log(
      "sagelite-electron-start poor-man map real-field composition smoke",
    );
    await python.exec(String.raw`
from sage.all import CC, RR, ZZ, factorial, sqrt
from sage.categories.poor_man_map import PoorManMap

real_field = RR(0).parent()
complex_field = CC(0).parent()
g = PoorManMap(factorial, domain=ZZ, codomain=ZZ)
h = PoorManMap(sqrt, domain=real_field, codomain=complex_field)
try:
    g * h
except ValueError as error:
    assert str(error) == (
        'the codomain Complex Field with 53 bits of precision '
        'does not coerce into the domain Integer Ring'
    )
else:
    raise AssertionError('incompatible poor-man map composition must fail')
composition = h * g
assert repr(composition) == (
    'A map from Integer Ring to Complex Field with 53 bits of precision'
)
assert composition.domain() is ZZ
assert composition.codomain() is complex_field
`);
    console.log(
      "sagelite-electron-ok poor-man map real-field composition smoke",
    );
    console.log(
      "sagelite-electron-start multi-filtered vector-space real-field smoke",
    );
    await python.exec(String.raw`
from sage.all import QQ, RR
from sage.modules.multi_filtered_vector_space import MultiFilteredVectorSpace

real_field = RR(0).parent()
changed = MultiFilteredVectorSpace(3, base_ring=QQ).change_ring(real_field)
direct = MultiFilteredVectorSpace(123, base_ring=real_field)
assert repr(changed) == 'Unfiltered RR^3'
assert repr(direct) == 'Unfiltered RR^123'
assert changed.base_ring() is real_field
assert direct.base_ring() is real_field
assert changed.dimension() == 3
assert direct.dimension() == 123
`);
    console.log(
      "sagelite-electron-ok multi-filtered vector-space real-field smoke",
    );
    console.log(
      "sagelite-electron-start fraction-field complex Laurent common-parent smoke",
    );
    await python.exec(String.raw`
from sage.all import CC, QQ, LaurentPolynomialRing, PolynomialRing
from sage.structure.element import coercion_model

rational_fraction = PolynomialRing(QQ, 't').fraction_field()
complex_laurent = LaurentPolynomialRing(CC, 't')
common = coercion_model.common_parent(rational_fraction, complex_laurent)
assert common is complex_laurent.fraction_field()
assert repr(common) == (
    'Fraction Field of Univariate Polynomial Ring in t '
    'over Complex Field with 53 bits of precision'
)
`);
    console.log(
      "sagelite-electron-ok fraction-field complex Laurent common-parent smoke",
    );
    console.log(
      "sagelite-electron-start real fraction-field reduction smoke",
    );
    await python.exec(String.raw`
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField

real_field = RealField(10)
ring = PolynomialRing(real_field, 'x')
x = ring.gen()
value = (x**2 + 2*x + 1) / (x + 1)
assert repr(value) == '(x^2 + 2.0*x + 1.0)/(x + 1.0)'
value.reduce()
assert repr(value) == 'x + 1.0'
assert value.parent().base_ring() is real_field
`);
    console.log(
      "sagelite-electron-ok real fraction-field reduction smoke",
    );
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
import gc
import weakref
from sage.combinat.combinat import polygonal_number
from sage.combinat.combination import Combinations
from sage.combinat.integer_lists import IntegerListsLex
from sage.combinat.integer_lists.base import IntegerListsBackend
from sage.combinat.perfect_matching import PerfectMatchings
from sage.combinat.set_partition import SetPartitions
from sage.misc.persist import dumps, loads
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
backend = IntegerListsBackend(3, length=2)
backend_ref = weakref.ref(backend)
backend_pickle = dumps(backend)
assert loads(backend_pickle) is backend
del backend
gc.collect()
assert backend_ref() is None
assert loads(backend_pickle) == IntegerListsBackend(3, length=2)
lex_backend = IntegerListsLex(3, length=2).backend
assert loads(dumps(lex_backend)) is lex_backend
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
    console.log("sagelite-electron-start real functional semantics smoke");
    await python.exec(String.raw`
import sage.all
from sage.misc.functional import N, _do_sqrt, log, numerical_approx, sqrt
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField

CC = ComplexField()
assert str(log(CC(-1))) == '3.14159265358979*I'
assert str(log(CC(0))) == '-infinity'
a = CC(-5).n(prec=40)
b = ComplexField(40)(-5)
assert a == b
assert a.parent() is b.parent()
assert str(numerical_approx(9)) == '9.00000000000000'
y = N(3.14, digits=3)
assert str(y) == '3.14'
assert y.str(base=2) == '11.001000111101'
assert str(N(3, prec=2)) == '3.0'
assert type(numerical_approx(CC(1/2))) is type(CC(0))
assert str(N(0, algorithm='foo')) == '0.000000000000000'
assert str(_do_sqrt(3, prec=10)) == '1.7'
assert str(_do_sqrt(3, prec=100)) == '1.7320508075688772935274463415'
assert str(sqrt(sage.all.RealNumber('1.1'), prec=100)) == '1.0488088481701515469914535137'
assert str(sqrt(sage.all.RealNumber('4.00'), prec=250)) == '2.0000000000000000000000000000000000000000000000000000000000000000000000000'
try:
    RealField(24).pi().n()
except TypeError as error:
    assert str(error) == 'cannot approximate to a precision of 53 bits, use at most 24 bits'
else:
    raise AssertionError('low-precision real unexpectedly increased precision')
`);
    console.log("sagelite-electron-ok real functional semantics smoke");
    console.log("sagelite-electron-start real pushout semantics smoke");
    await python.exec(String.raw`
import sage.all
from sage.all import CC, CDF, QQ, ZZ
from sage.categories.pushout import AlgebraicClosureFunctor, ConstructionFunctor, MultiPolynomialFunctor, pushout
from sage.categories.rings import Rings
from sage.rings.real_mpfr import RealField

RR = RealField()
F = MultiPolynomialFunctor(['x', 'y'], None)
assert str(F(CC)) == 'Multivariate Polynomial Ring in x, y over Complex Field with 53 bits of precision'
F2 = RR.construction()[0]
assert F2.type == 'MPFR'
assert F2.extras == {'rnd': 0, 'sci_not': False}
closure = AlgebraicClosureFunctor()
assert str(closure(RR)) == 'Complex Field with 53 bits of precision'
double_closure = CDF.construction()[0]
assert str(double_closure(RR)) == 'Complex Field with 53 bits of precision'

class EvenPolynomialRing(type(QQ['x'])):
    def __init__(self, base, var):
        super().__init__(base, var)
        self.register_embedding(base[var])
    def construction(self):
        return EvenPolynomialFunctor(), self.base()[self.variable_name()]
    def _coerce_map_from_(self, R):
        return self.base().has_coerce_map_from(R)

class EvenPolynomialFunctor(ConstructionFunctor):
    rank = 10
    coercion_reversed = True
    def __init__(self):
        ConstructionFunctor.__init__(self, Rings(), Rings())
    def _apply_functor(self, R):
        return EvenPolynomialRing(R.base(), R.variable_name())

assert pushout(EvenPolynomialRing(QQ, 'x'), RR).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x'), RR['x']).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x'), EvenPolynomialRing(RR, 'x')).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x')**2, RR**2).base_ring().base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x')**2, RR['x']**2).base_ring().base_ring() is RR
`);
    console.log("sagelite-electron-ok real pushout semantics smoke");
    console.log(
      "sagelite-electron-start real sparse polynomial semantics smoke",
    );
    await python.exec(String.raw`
import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.integer_ring import ZZ
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField

real_ring = PolynomialRing(RealField(19), 'x', sparse=True)
x = real_ring.gen()
f = (2 - RealField()('3.5') * x)**3
assert repr(f) == '-42.875*x^3 + 73.500*x^2 - 42.000*x + 8.0000'
assert repr(f[:2]) == '-42.000*x + 8.0000'
for key, message in (
    (slice(1, 3), 'polynomial slicing with a start is not defined'),
    (slice(1, 3, 2), 'polynomial slicing with a step is not defined'),
):
    try:
        f[key]
    except IndexError as error:
        assert str(error) == message
    else:
        raise AssertionError('invalid sparse polynomial slice unexpectedly succeeded')
try:
    f['hello']
except TypeError as error:
    assert str(error) == 'list indices must be integers, not str'
else:
    raise AssertionError('string sparse polynomial index unexpectedly succeeded')
complex_ring = PolynomialRing(ComplexField(), 'z', sparse=True)
z = complex_ring.gen()
z._unsafe_mutate(1, 0)
assert z == 0
integer_ring = PolynomialRing(ZZ, 't', sparse=True)
t = integer_ring.gen()
p = t**(2**100) - 5
try:
    p.shift(RealField()('1.5'))
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral sparse polynomial shift unexpectedly succeeded')
`);
    console.log(
      "sagelite-electron-ok real sparse polynomial semantics smoke",
    );
    console.log("sagelite-electron-start real-part literal semantics smoke");
    await python.exec(String.raw`
import sage.all
from sage.functions.other import real
from sage.rings.real_mpfr import RealLiteral

a = sage.all.RealNumber('2.5')
assert str(real(a)) == '2.50000000000000'
assert type(real(a)) is RealLiteral
assert real(a) is a
`);
    console.log("sagelite-electron-ok real-part literal semantics smoke");
    console.log(
      "sagelite-electron-start quaternion polynomial semantics smoke",
    );
    await python.exec(String.raw`
from sage.all import PolynomialRing, QQ, QuaternionAlgebra

A = QuaternionAlgebra(QQ, -1, -1)
i, j, k = A.gens()
R = PolynomialRing(A, 'w', sparse=True)
w = R.gen()
f = w**3 + (i + j)*w + 1
assert str(f) == 'w^3 + (i + j)*w + 1'
assert str(f**2) == 'w^6 + (2*i + 2*j)*w^4 + 2*w^3 - 2*w^2 + (2*i + 2*j)*w + 1'
f = w + i
g = w + j
assert str(f*g) == 'w^2 + (i + j)*w + k'
assert str(g*f) == 'w^2 + (i + j)*w - k'
`);
    console.log(
      "sagelite-electron-ok quaternion polynomial semantics smoke",
    );
    console.log("sagelite-electron-start real argument evaluation smoke");
    await python.exec(String.raw`
import sage.all
from sage.functions.other import arg

value = arg(float('3.0'))
assert value == 0.0
assert type(value) is float
`);
    console.log("sagelite-electron-ok real argument evaluation smoke");
    console.log(
      "sagelite-electron-start symbolic binomial internal evaluation smoke",
    );
    await python.exec(String.raw`
from sage.functions.other import binomial
from sage.rings.integer_ring import ZZ
from sage.rings.real_mpfr import RealNumber, create_RealNumber

value = binomial._eval_(create_RealNumber('5.'), ZZ(3))
assert value == create_RealNumber('10.')
assert type(value) is RealNumber
`);
    console.log(
      "sagelite-electron-ok symbolic binomial internal evaluation smoke",
    );
    console.log(
      "sagelite-electron-start real and complex manifold category semantics smoke",
    );
    await python.exec(String.raw`
from sage.all import CC, RR
from sage.categories.manifolds import Manifolds

real_manifolds = Manifolds(RR)
assert str(real_manifolds) == 'Category of manifolds over Real Field with 53 bits of precision'
assert list(map(str, real_manifolds.super_categories())) == ['Category of topological spaces']
connected = real_manifolds.Connected()
finite_connected = connected.FiniteDimensional()
assert str(connected) == 'Category of connected manifolds over Real Field with 53 bits of precision'
assert str(finite_connected) == 'Category of finite dimensional connected manifolds over Real Field with 53 bits of precision'
differentiable = real_manifolds.Differentiable()
smooth = real_manifolds.Smooth()
analytic = real_manifolds.Analytic()
almost_complex = real_manifolds.AlmostComplex()
assert smooth.super_categories() == [differentiable]
assert analytic.super_categories() == [smooth]
assert almost_complex.super_categories() == [smooth]
complex_manifolds = Manifolds(CC).Complex()
assert str(complex_manifolds) == 'Category of complex manifolds over Complex Field with 53 bits of precision'
assert Manifolds(CC).Complex.__module__ == 'sage.categories.manifolds'
`);
    console.log(
      "sagelite-electron-ok real and complex manifold category semantics smoke",
    );
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
      "sagelite-electron-start unknown-length word conjugacy smoke",
    );
    await python.exec(String.raw`
from sage.combinat.words.word import Word

z = Word([2] * 100)
assert z.is_conjugate_with(Word(iter([2] * 100), length='unknown'))
assert not z.is_conjugate_with(Word(iter([2] * 99), length='unknown'))
assert not z.is_conjugate_with(Word(iter([2] * 101), length='unknown'))
assert z.is_conjugate_with(
    Word(iter([2] * 100), length='unknown', caching=False)
)
`);
    console.log(
      "sagelite-electron-ok unknown-length word conjugacy smoke",
    );
    console.log("sagelite-electron-start empty species arithmetic smoke");
    await python.exec(String.raw`
from sage.combinat.species.library import CharacteristicSpecies, EmptySpecies

empty = EmptySpecies()
characteristic = CharacteristicSpecies(2)
assert characteristic + empty is characteristic
assert empty + characteristic is characteristic
weighted_empty = EmptySpecies(weight=2)
assert characteristic * weighted_empty is weighted_empty
assert weighted_empty * characteristic is weighted_empty
`);
    console.log("sagelite-electron-ok empty species arithmetic smoke");
    console.log(
      "sagelite-electron-start real characteristic Sturmian factor smoke",
    );
    await python.exec(String.raw`
from sage.all import QQ
from sage.combinat.words.word_generators import words
from sage.rings.real_mpfr import RealField

slope = RealField(200)('0.31415926535897932384626433832795028841971693993751')
word = words.CharacteristicSturmianWord(slope)[:100]
assert len(word) == 100
assert word.is_sturmian_factor()
assert repr(words.CharacteristicSturmianWord(QQ(4) / 5)) == 'word: 11110'
assert repr(words.CharacteristicSturmianWord(QQ(5) / 14)) == 'word: 01001001001001'
def cf():
    yield 0
    yield 2
    while True:
        yield 1
F = words.CharacteristicSturmianWord(cf())
Fib = words.FibonacciWord()
assert repr(F) == 'word: 0100101001001010010100100101001001010010...'
assert F[:10000] == Fib[:10000]
assert repr(words.CharacteristicSturmianWord(cf(), 'rs')) == 'word: rsrrsrsrrsrrsrsrrsrsrrsrrsrsrrsrrsrsrrsr...'
`);
    console.log(
      "sagelite-electron-ok real characteristic Sturmian factor smoke",
    );
    console.log(
      "sagelite-electron-start real trigonometric evaluation smoke",
    );
    await python.exec(String.raw`
from sage.functions.trig import arccos, arcsin, tan
from sage.rings.real_mpfr import RealField

RR = RealField(53)
assert repr(tan(RR('3.1415'))) == '-0.0000926535900581913'
assert repr(tan(RR('3.1415') / 4)) == '0.999953674278156'
assert repr(arcsin(RR('0.5'))) == '0.523598775598299'
assert repr(arccos(RR('0.5'))) == '1.04719755119660'
`);
    console.log(
      "sagelite-electron-ok real trigonometric evaluation smoke",
    );
    console.log(
      "sagelite-electron-start real hyperbolic evaluation smoke",
    );
    await python.exec(String.raw`
from sage.functions.hyperbolic import asinh, atanh, cosh, coth, csch, sech, sinh, tanh
from sage.functions.trig import tan
from sage.rings.real_mpfr import RealField

RR = RealField(53)
x = RR('3.1415')
assert repr(sinh(x)) == '11.5476653707437'
assert repr(cosh(x)) == '11.5908832931176'
assert repr(tanh(x)) == '0.996271386633702'
assert repr(tan(x / 4)) == '0.999953674278156'
assert repr(coth(x)) == '1.00374256795520'
assert repr(sech(x)) == '0.0862747018248192'
assert repr(csch(x)) == '0.0865975907592133'
assert repr(asinh(RR('0.5'))) == '0.481211825059603'
assert repr(atanh(RR('0.5'))) == '0.549306144334055'
`);
    console.log(
      "sagelite-electron-ok real hyperbolic evaluation smoke",
    );
    console.log(
      "sagelite-electron-start real ring category epsilon smoke",
    );
    await python.exec(String.raw`
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField

complex_field = ComplexField(53)
real_field = RealField(53)
assert complex_field.is_subring(complex_field)
assert repr(complex_field.epsilon()) == '2.22044604925031e-16'
assert repr(RealField(10).epsilon()) == '0.0020'
assert repr(real_field['x'].epsilon()) == '2.22044604925031e-16'
`);
    console.log(
      "sagelite-electron-ok real ring category epsilon smoke",
    );
    console.log(
      "sagelite-electron-start real error function evaluation smoke",
    );
    await python.exec(String.raw`
from sage.functions.error import erf, erfc
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField

C53 = ComplexField(53)
C100 = ComplexField(100)
C1000 = ComplexField(1000)
R53 = RealField(53)
R100 = RealField(100)
assert repr(erf(C100(2, 3))) == '-20.829461427614568389103088452 + 8.6873182714701631444280787545*I'
assert repr(R53(3).erf()) == '0.999977909503001'
assert repr(C53(erf(C1000(2, 3)))) == '-20.8294614276146 + 8.68731827147016*I'
assert repr(erfc(R100(1) / 2)) == '0.47950012218695346231725334611'
`);
    console.log(
      "sagelite-electron-ok real error function evaluation smoke",
    );
    console.log(
      "sagelite-electron-start real parent numeric predicates smoke",
    );
    await python.exec(String.raw`
from sage.all import CC, RR, RLF

assert [RR._is_numerical(), CC._is_numerical()] == [True, True]
assert [RR._is_real_numerical(), RLF._is_real_numerical()] == [True, True]
assert CC._is_real_numerical() is False
`);
    console.log(
      "sagelite-electron-ok real parent numeric predicates smoke",
    );
    console.log(
      "sagelite-electron-start real element core semantics smoke",
    );
    await python.exec(String.raw`
from sage.all import CC, QQ, RR, ZZ, parent

q = QQ(3) / 5
q._set_parent(CC)
assert str(parent(q)) == 'Complex Field with 53 bits of precision'
try:
    q._set_parent(float)
except TypeError as error:
    assert str(error) == 'Cannot convert type to sage.structure.parent.Parent'
else:
    raise AssertionError('setting an element parent to float unexpectedly succeeded')
assert repr((QQ(2) / 3).numerical_approx()) == '0.666666666666667'
assert repr(ZZ(0).n(algorithm='foo')) == '0.000000000000000'
assert repr((QQ(2) / 3).n()) == '0.666666666666667'
assert repr(RR(-1).abs()) == '1.00000000000000'
`);
    console.log(
      "sagelite-electron-ok real element core semantics smoke",
    );
    console.log(
      "sagelite-electron-start real coercion semantics smoke",
    );
    await python.exec(String.raw`
import io
import operator
from contextlib import redirect_stdout
from sage.all import CC, QQ, RR, ZZ, RealField, parent, polygen
from sage.rings.real_mpfr import RR as RR_parent
from sage.structure.coerce import parent_is_numerical
from sage.structure.element import get_coercion_model

assert [parent_is_numerical(R) for R in [RR, CC]] == [True, True]
x = polygen(RR)
p = x**3 + 2*x - 1
assert repr(p(float('1.2'))) == '3.12800000000000'
assert repr(p(int('2'))) == '11.0000000000000'
cm = get_coercion_model()
R100 = RealField(100)
explanation = io.StringIO()
with redirect_stdout(explanation):
    cm.explain(R100, float, operator.add)
assert explanation.getvalue() == 'Right operand is numeric, will attempt coercion in both directions.\nUnknown result parent.\n'
assert parent(R100(1) + float(1)) is float
assert cm.common_parent(ZZ, QQ, RR) is RR_parent
real_fields = [RealField(prec) for prec in range(10, 101, 10)]
assert cm.common_parent(*real_fields) is real_fields[0]
left, right = cm.discover_coercion(RR, QQ)
assert left is None
assert right.domain() is QQ
assert right.codomain() is RR_parent
`);
    console.log(
      "sagelite-electron-ok real coercion semantics smoke",
    );
    console.log(
      "sagelite-electron-start continued fraction real approximation smoke",
    );
    await python.exec(String.raw`
from sage.all import QQ, RealField, RealNumber, continued_fraction
from sage.repl.preparse import preparse
from sage.rings.real_mpfr import RealLiteral

assert repr(continued_fraction(QQ(1) / 2).n()) == '0.500000000000000'
assert repr(continued_fraction([0, 4]).n()) == '0.250000000000000'
assert repr(continued_fraction([12, 1, 3, 4, 2, 2, 3, 1, 2]).n(digits=4)) == '12.76'
assert continued_fraction(QQ(12) / 7).n(digits=13) == (QQ(12) / 7).n(digits=13)
assert continued_fraction(-QQ(14) / 333).n(digits=21) == (-QQ(14) / 333).n(digits=21)
for prec in [17, 24, 53, 128, 256]:
    for rnd in ['RNDN', 'RNDD', 'RNDU', 'RNDZ', 'RNDA']:
        R = RealField(prec=prec, rnd=rnd)
        assert R(continued_fraction(QQ(17) / 389)) == R(QQ(17) / 389)
a = continued_fraction(-QQ(17) / 389)
assert float(a) == float(-QQ(17) / 389)
literal = eval(preparse('1.575709393346379'))
assert type(literal) is RealLiteral
`);
    console.log(
      "sagelite-electron-ok continued fraction real approximation smoke",
    );
    console.log(
      "sagelite-electron-start real multivariate polynomial construction smoke",
    );
    await python.exec(String.raw`
import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.integer_ring import ZZ
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField

CC = ComplexField()
RR = RealField()

R_real = PolynomialRing(RR, names=('x', 'y'))
try:
    ZZ(R_real(RR('0.5')))
except TypeError as err:
    assert str(err) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral real polynomial unexpectedly coerced to ZZ')

R_complex = PolynomialRing(CC, names=('x', 'y'))
x, y = R_complex.gens()
i = CC(0, 1)
F = ((0.759099196558145 + 0.845425869641446*i)*x**3
     + (84.8317207268542 + 93.8840848648033*i)*x**2*y
     + (3159.07040755858 + 3475.33037377779*i)*x*y**2
     + (39202.5965389079 + 42882.5139724962*i)*y**3)
assert F.parent() is R_complex
assert F.degree() == 3
assert len(F.dict()) == 4
assert all(coefficient.parent() is CC for coefficient in F.coefficients())
`);
    console.log(
      "sagelite-electron-ok real multivariate polynomial construction smoke",
    );
    console.log(
      "sagelite-electron-start rational field real embeddings smoke",
    );
    await python.exec(String.raw`
import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.infinity import Infinity
from sage.rings.rational_field import QQ
from sage.rings.real_mpfr import RealField

RR = RealField()
one_seventh = QQ(1) / QQ(7)
assert str(RealField(9).pi()) == '3.1'
assert QQ(RR(one_seventh)) - one_seventh == 0

completion = QQ.completion(Infinity, 53)
assert completion is RR

real_places = QQ.places()
assert len(real_places) == 1
assert real_places[0].codomain() is RR
assert real_places[0](QQ(3) / QQ(2)) == RR('1.5')

complex_place = QQ.places(prec=200, all_complex=True)[0]
assert complex_place.codomain() is ComplexField(200)
assert complex_place(QQ(3) / QQ(2)) == ComplexField(200)('1.5')

complex_embedding = QQ.complex_embedding()
assert complex_embedding.codomain() is ComplexField(53)
assert complex_embedding(one_seventh) == ComplexField(53)(one_seventh)

complex_embedding_20 = QQ.complex_embedding(20)
assert complex_embedding_20.codomain() is ComplexField(20)
assert complex_embedding_20(one_seventh) == ComplexField(20)(one_seventh)
`);
    console.log(
      "sagelite-electron-ok rational field real embeddings smoke",
    );
    console.log(
      "sagelite-electron-start real exponential and Lambert W smoke",
    );
    await python.exec(String.raw`
import sage.all
from sage.functions.log import exp, lambert_w
from sage.rings.real_mpfr import RealField

R100 = RealField(100)
exponential = exp(R100(2))
assert exponential.parent() is R100
assert exponential.precision() == 100
assert str(exponential) == '7.3890560989306502272304274606'

lambert = lambert_w(R100(1))
assert lambert.parent() is R100
assert lambert.precision() == 100
assert str(lambert) == '0.56714329040978387299996866221'
`);
    console.log(
      "sagelite-electron-ok real exponential and Lambert W smoke",
    );
    console.log("sagelite-electron-start rational real methods smoke");
    await python.exec(String.raw`
import sage.all
from sage.rings.rational_field import QQ
from sage.rings.real_double import RDF
from sage.rings.real_mpfr import RealField

R = RealField()
R100 = RealField(100)
assert str((QQ(355) / QQ(113)).continued_fraction().n(digits=10)) == '3.141592920'

a = QQ(25) / QQ(6)
assert [str(a.local_height(p)) for p in (2, 3, 5)] == [
    '0.693147180559945',
    '1.09861228866811',
    '0.000000000000000',
]
a = QQ(6) / QQ(25)
assert str(a.local_height_arch()) == '0.000000000000000'
assert str((1 / a).local_height_arch()) == '1.42711635564015'
assert str((1 / a).local_height_arch(100)) == '1.4271163556401457483890413081'
a = QQ(5) / QQ(6)
assert str(a.global_height_non_arch()) == '1.79175946922805'
assert str(a.global_height_arch()) == '0.000000000000000'

assert str(R(QQ(1) / QQ(7))) == '0.142857142857143'
assert str(R(QQ(1) / QQ(8))) == '0.125000000000000'
assert str(R(QQ(1) / QQ(6))) == '0.166666666666667'
assert str(R100(QQ(333) / QQ(106))) == '3.1415094339622641509433962264'
r = RDF(QQ(-17) / QQ(89))
assert abs(R(r).exact_rational() - QQ(-17) / QQ(89)) <= R(r.ulp()) / 2

assert str((QQ(124) / QQ(345)).log(5, 100)) == '-0.63578895682825611710391773754'
assert str((QQ(125) / QQ(8)).log(QQ(5) / QQ(2), prec=53)) == '3.00000000000000'
assert str((QQ(1) / QQ(3)).gamma(prec=100)) == '2.6789385347077476336556929410'
assert str((QQ(1) / QQ(2)).gamma(prec=100)) == '1.7724538509055160272981674833'
`);
    console.log("sagelite-electron-ok rational real methods smoke");
    console.log("sagelite-electron-start real Wigner evaluation smoke");
    await python.exec(String.raw`
import sage.all
from sage.functions.wigner import gaunt, wigner_3j, wigner_9j
from sage.rings.real_mpfr import RealField

RR = RealField(53)
assert str(wigner_3j(2500, 2500, 5000, 2488, 2400, -4888, prec=64)) == '7.60424456883448589e-12'
try:
    wigner_9j(1, 1, 1, RR('0.5'), 1, RR('1.5'), RR('0.5'), 1, RR('2.5'), prec=64)
except ValueError as error:
    assert str(error) == 'j values must be integer or half integer and fulfill the triangle relation'
else:
    raise AssertionError('invalid Wigner 9-j inputs were accepted')
for args in (
    (RR('1.2'), 0, RR('1.2'), 0, 0, 0),
    (1, 0, 1, RR('1.1'), 0, RR('-1.1')),
):
    try:
        gaunt(*args)
    except TypeError as error:
        assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
    else:
        raise AssertionError('non-integral Gaunt inputs were accepted')
`);
    console.log("sagelite-electron-ok real Wigner evaluation smoke");
    console.log(
      "sagelite-electron-start category parameter refinement delivery smoke",
    );
    await python.exec(String.raw`
import sage.rings.abc
from sage.all import Algebras, CDF, Fields, GF, GroupAlgebras, Mod, Modules, QQ, Rings, VectorSpaces, ZZ, cartesian_product, oo
from sage.categories.bimodules import Bimodules
from sage.functions.bessel import bessel_I, bessel_J, bessel_K, bessel_Y
from sage.functions.exp_integral import Ei, exp_integral_e, exp_integral_e1, log_integral, log_integral_offset, sin_integral
from sage.functions.gamma import gamma, gamma_inc_lower
from sage.functions.orthogonal_polys import chebyshev_T, chebyshev_U, gen_legendre_P, gen_legendre_Q
from sage.functions.other import frac, real_nth_root
from sage.misc.sage_input import SIE_literal_stringrep, SageInputBuilder, sage_input
from sage.rings.complex_mpfr import ComplexField, ComplexField_class
from sage.rings.infinity import InfinityRing, UnsignedInfinityRing, check_comparison
from sage.rings.real_double import RDF
from sage.rings.real_mpfr import RealField, RealField_class, RealNumber
from sage.schemes.projective.projective_space import ProjectiveSpace

assert VectorSpaces(Fields())._subcategory_hook_(Algebras(Fields().Finite())) is True
assert Modules(Rings())._subcategory_hook_(Modules(GroupAlgebras(Rings()))) is True
assert VectorSpaces(Fields())._subcategory_hook_(Algebras(QQ)) is True
assert QQ['x'] in Algebras(Fields())
assert repr(Bimodules.an_instance()) == 'Category of bimodules over Rational Field on the left and Real Field with 53 bits of precision on the right'
CC = ComplexField()
RR = RealField()
assert repr(UnsignedInfinityRing(CC(oo))) == 'Infinity'
assert UnsignedInfinityRing.has_coerce_map_from(CC) is True
complex_infinity = CC(0, oo)
assert repr((InfinityRing(CC(oo)), InfinityRing(CC(-oo)))) == '(+Infinity, -Infinity)'
try:
    InfinityRing(complex_infinity)
except ValueError as error:
    assert str(error) == 'infinite but not with +/- phase'
else:
    raise AssertionError('complex infinity unexpectedly coerced to signed infinity')
try:
    InfinityRing(CDF(complex_infinity))
except ValueError as error:
    assert str(error) == 'infinite but not with +/- phase'
else:
    raise AssertionError('double complex infinity unexpectedly coerced to signed infinity')
assert InfinityRing.has_coerce_map_from(CC) is False
assert complex_infinity < CC(1)
for real_ring in (RR, RealField(200)):
    check_comparison(real_ring)
real_zero_vector = (RR**0)()
assert real_zero_vector.dot_product(real_zero_vector) == RR.zero()
assert real_zero_vector.parent().base_ring() is RR
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
assert repr(cartesian_product([QQ, ZZ, RR]).one()) == '(1, 1, 1.00000000000000)'
C = cartesian_product([QQ, ZZ, RR, GF(5)])
c = C([2, -1, 2, 2])
assert repr(c) == '(2, -1, 2.00000000000000, 2)'
assert repr(~c) == '(1/2, -1, 0.500000000000000, 3)'
try:
    ~C([0, 2, 2, 2])
except ZeroDivisionError as error:
    assert str(error) == 'rational division by zero'
else:
    raise AssertionError('noninvertible Cartesian product element was accepted')
assert repr(~C([2, 2, 2, 2])) == '(1/2, 1/2, 0.500000000000000, 3)'
P = ProjectiveSpace(QQ, 1, 'x')
P2 = ProjectiveSpace(CC, 1, 'y')
assert repr(P2) == 'Projective Space of dimension 1 over Complex Field with 53 bits of precision'
assert P2(CC)._coerce_map_from_(P(QQ)) is False
fractional_part = frac(RR('5.4'))
assert repr(fractional_part) == '0.400000000000000'
assert type(fractional_part) is RealNumber
sib = SageInputBuilder()
assert repr(sib.result(sib(RealField(200)(1.5), True))) == '1.5000000000000000000000000000000000000000000000000000000000000'
assert repr(sib.result(sib(RealField(200)(1.5), 2))) == '1.5'
assert repr(sage_input(float(42), preparse=True, verify=True)) == '# Verified\nfloat(42)'
assert repr(sage_input((ZZ(2), RR('3.5'), 'Hi'), verify=True)) == "# Verified\n(2, 3.5, 'Hi')"
assert isinstance(sib(RR('3.14159'), True), SIE_literal_stringrep)
assert repr(sib((RR('3.5'), -ZZ(2)))) == '{tuple: ({atomic:3.5}, {unop:- {atomic:2}})}'
positive_cube_root = real_nth_root(RR('2.'), 3)
negative_cube_root = real_nth_root(RR('-2.'), 3)
high_precision_square_root = real_nth_root(RealField(100)(2), 2)
assert repr(positive_cube_root) == '1.25992104989487'
assert repr(negative_cube_root) == '-1.25992104989487'
assert repr(high_precision_square_root) == '1.4142135623730950488016887242'
assert positive_cube_root.parent() is RR
assert negative_cube_root.parent() is RR
assert high_precision_square_root.parent().precision() == 100
exp_e = exp_integral_e(1, RealField(100)(1))
exp_e1 = exp_integral_e1(RealField(100)(1))
exp_e1_half = exp_integral_e1(RealField(200)('0.5'))
log_i = log_integral(RealField(200)('1e6'))
log_i_offset = log_integral_offset(RealField(200)('1e6'))
sin_i = sin_integral(RealField(200)('1e23'))
ei = Ei(RealField(300)('1.1'))
assert repr(exp_e) == '0.21938393439552027367716377546'
assert repr(exp_e1) == '0.21938393439552027367716377546'
assert repr(exp_e1_half) == '0.55977359477616081174679593931508523522684689031635351524829'
assert repr(log_i) == '78627.549159462181919862910747947261161321874382421767074759'
assert repr(log_i_offset) == '78626.503995682064427078066159058066548185351766843615873183'
assert repr(sin_i) == '1.5707963267948966192313288218697837425815368604836679189519'
assert repr(ei) == '2.16737827956340282358378734233807621497112737591639704719499002090327541763352339357795426'
assert exp_e.parent().precision() == 100
assert exp_e1.parent().precision() == 100
assert exp_e1_half.parent().precision() == 200
assert log_i.parent().precision() == 200
assert log_i_offset.parent().precision() == 200
assert sin_i.parent().precision() == 200
assert ei.parent().precision() == 300
R113 = RealField(113)
bessel_argument = R113('8.935761195587725798762818805462843676e-01')
bessel_argument_200 = RealField(200)(bessel_argument)
for order in range(-10, 11):
    assert bessel_J(R113(order), bessel_argument) == R113(bessel_J(order, bessel_argument_200))
bessel_y_200 = bessel_Y(0, RealField(200)(1))
bessel_i_200 = bessel_I(0, RealField(200)(1))
bessel_k_200 = bessel_K(0, RealField(200)(1))
bessel_k_128 = bessel_K(0, RealField(128)(1))
assert repr(bessel_y_200) == '0.088256964215676957982926766023515162827817523090675546711044'
assert repr(bessel_i_200) == '1.2660658777520083355982446252147175376076703113549622068081'
assert repr(bessel_k_200) == '0.42102443824070833333562737921260903613621974822666047229897'
assert repr(bessel_k_128) == '0.42102443824070833333562737921260903614'
bessel_y_53 = bessel_Y(RealField(200)(1), RR(1))
bessel_y_order_200 = bessel_Y(RealField(200)(1), 1)
assert repr(bessel_y_53) == '-0.781212821300289'
assert repr(bessel_y_order_200) == '-0.78121282130028871654715000004796482054990639071644460784383'
assert bessel_y_53.parent().precision() == 53
assert bessel_y_order_200.parent().precision() == 200
assert RR(-1).gamma().is_NaN()
assert RDF(-1).gamma().is_NaN()
assert repr(gamma_inc_lower(3, RR(2))) == '0.646647167633873'
assert repr(gamma_inc_lower(0, RR(2))) == '+infinity'
gamma_100 = gamma(RealField(100)('2.5'))
assert repr(gamma_100) == '1.3293403881791370204736256125'
assert gamma_100.parent().precision() == 100
assert RealField(1024).precision() == 1024
assert repr(chebyshev_T._evalf_(10, 3)) == '2.26195370000000e7'
assert repr(chebyshev_T._evalf_(10, 3, parent=RealField(75))) == '2.261953700000000000000e7'
assert repr(chebyshev_T._evalf_(5, RR('0.3'))) == '0.998880000000000'
for function in (chebyshev_T, chebyshev_U):
    try:
        function._evalf_(RR('1.5'), Mod(8, 9))
    except TypeError as error:
        assert str(error) == f'cannot evaluate {function} with parent Ring of integers modulo 9'
    else:
        raise AssertionError(f'{function} accepted a modular argument')
assert repr(chebyshev_T(RR('1234.5'), RDF('2.1'))) == '5.48174256255782e735'
try:
    chebyshev_T._evalf_(ZZ(10)**6, RR('0.1'))
except Exception as error:
    assert type(error).__name__ == 'NoConvergence'
    assert str(error) == 'Hypergeometric series converges too slowly. Try increasing maxterms.'
else:
    raise AssertionError('large Chebyshev evaluation unexpectedly converged')
assert repr(chebyshev_T(ZZ(10)**6, RR('0.1'))) == '0.636384327171504'
assert abs(gen_legendre_P.eval_gen_poly(1, 1, RR('0.5')) - RR('-0.866025403784439')) < RR('1e-14')
assert repr(gen_legendre_Q(2, 1, ComplexField(70)(3))) == '-39.985946443425296223 + 0.016511473614919329585*I'
`);
    console.log(
      "sagelite-electron-ok category parameter refinement delivery smoke",
    );
    console.log("sagelite-electron-start real set membership smoke");
    await python.exec(String.raw`
from sage.all import QQ, ZZ
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
from sage.sets.set import Set

CC = ComplexField()
RR = RealField()
real_set = Set(RR)
assert real_set.an_element() == RR.one()
assert Set([RR('2.5'), 4, 5, 6]).difference(Set(ZZ)) == Set([RR('2.5')])
rational_real_intersection = Set(QQ).intersection(real_set)
assert 5 in rational_real_intersection
complex_zero = CC.zero()
assert complex_zero not in rational_real_intersection
assert complex_zero not in Set(QQ).difference(Set(ZZ))
assert complex_zero not in Set(QQ).symmetric_difference(Set(ZZ))
`);
    console.log("sagelite-electron-ok real set membership smoke");
    console.log("sagelite-electron-start real metric space semantics smoke");
    await python.exec(String.raw`
from sage.all import QQ
from sage.categories.metric_spaces import MetricSpaces
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField

CC = ComplexField()
RR = RealField()
assert CC.dist(3, 2) == RR.one()
real_plane = RR.cartesian_product(RR)
assert real_plane in MetricSpaces()
assert real_plane in MetricSpaces().Complete()
rational_real_plane = QQ.cartesian_product(RR)
assert rational_real_plane in MetricSpaces()
assert rational_real_plane not in MetricSpaces().Complete()
`);
    console.log("sagelite-electron-ok real metric space semantics smoke");
    console.log("sagelite-electron-start real field arithmetic semantics smoke");
    await python.exec(String.raw`
import sage.all
from sage.categories.fields import Fields
from sage.rings.complex_mpfr import ComplexField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField

CC = ComplexField()
RR = RealField()
assert Fields()(RR) is RR
assert RR.fraction_field() is RR
assert CC.fraction_field() is CC
R = PolynomialRing(RR, 'x')
x = R.gen()
assert repr((x**3).gcd(x**5 + 1)) == '1.00000000000000'
assert (x**3).gcd(x**5 + x**2) == x**2
assert RR('15.0').gcd(RR('12.0')) == RR(3)
assert RR('15.0').lcm(RR('12.0')) == RR(60)
assert RR('12.0').xgcd(RR('8.0')) == (RR(4), RR(1), RR(-1))
try:
    RR.zero().factor()
except ArithmeticError as error:
    assert str(error) == 'factorization of 0.000000000000000 is not defined'
else:
    raise AssertionError('zero real factorization unexpectedly succeeded')
`);
    console.log("sagelite-electron-ok real field arithmetic semantics smoke");
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

nested = Set([Set([]), Set([1])])
assert nested(nested.an_element()) in nested

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
