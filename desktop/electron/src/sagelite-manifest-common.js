"use strict";

const { createHash } = require("crypto");
const {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  statSync,
} = require("fs");
const { isAbsolute, join } = require("path");

const sageliteManifestName = "sagelite-electron-resources.json";

const expectedSageliteRuntimeDependencyPaths = Object.freeze([
  "deps/cypari2",
  "deps/primecountpy",
  "deps/libcxx",
  "deps/cysignals",
  "deps/memory_allocator",
  "deps/jinja2",
  "deps/platformdirs",
  "deps/gmpy2",
  "deps/numpy",
  "deps/cython",
]);

const expectedSageliteNativeLibraryPaths = Object.freeze([
  "deps/libcxx/libcxx.so",
  "deps/primecountpy/primecountpy/libcxx.so",
]);

const expectedSageliteRequiredToolPaths = Object.freeze([
  "sagelite-manifest-common.cjs",
  "sagelite-electron-smoke.cjs",
]);

const expectedSageliteMandatoryResourcePaths = Object.freeze([
  "site-packages/sage/__init__.py",
  "site-packages/sage/all.py",
  "site-packages/sage/env.py",
  "site-packages/sage/arith/__init__.py",
  "site-packages/sage/arith/all.py",
  "site-packages/sage/arith/functions.cpython-314-wasm32-wasi.so",
  "site-packages/sage/arith/misc.py",
  "site-packages/sage/arith/power.cpython-314-wasm32-wasi.so",
  "site-packages/sage/arith/rational_reconstruction.cpython-314-wasm32-wasi.so",
  "site-packages/sage/arith/srange.cpython-314-wasm32-wasi.so",
  "site-packages/sage/misc/__init__.py",
  "site-packages/sage/misc/flatten.py",
  "site-packages/sage/misc/functional.py",
  "site-packages/sage/misc/misc_c.cpython-314-wasm32-wasi.so",
  "site-packages/sage/functions/__init__.py",
  "site-packages/sage/functions/all.py",
  "site-packages/sage/functions/prime_pi.cpython-314-wasm32-wasi.so",
  "site-packages/sage/categories/__init__.py",
  "site-packages/sage/categories/action.cpython-314-wasm32-wasi.so",
  "site-packages/sage/categories/algebras.py",
  "site-packages/sage/categories/algebras_with_basis.py",
  "site-packages/sage/categories/associative_algebras.py",
  "site-packages/sage/categories/category.py",
  "site-packages/sage/categories/category_cy_helper.cpython-314-wasm32-wasi.so",
  "site-packages/sage/categories/category_singleton.cpython-314-wasm32-wasi.so",
  "site-packages/sage/categories/category_with_axiom.py",
  "site-packages/sage/categories/additive_monoids.py",
  "site-packages/sage/categories/commutative_algebras.py",
  "site-packages/sage/categories/cartesian_product.py",
  "site-packages/sage/categories/enumerated_sets.py",
  "site-packages/sage/categories/finite_dimensional_algebras_with_basis.py",
  "site-packages/sage/categories/finite_dimensional_modules_with_basis.py",
  "site-packages/sage/categories/groupoid.py",
  "site-packages/sage/categories/modules.py",
  "site-packages/sage/categories/modules_with_basis.py",
  "site-packages/sage/categories/monoids.py",
  "site-packages/sage/structure/category_object.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/coerce.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/factory.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/parent.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/parent_old.cpython-314-wasm32-wasi.so",
  "site-packages/sage/structure/__init__.py",
  "site-packages/sage/structure/sequence.py",
  "site-packages/sage/structure/unique_representation.py",
  "site-packages/sage/structure/factorization.py",
  "site-packages/sage/structure/factorization_integer.py",
  "site-packages/sage/rings/factorint.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/factorint_flint.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/factorint_pari.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/__init__.py",
  "site-packages/sage/rings/abc.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/all.py",
  "site-packages/sage/rings/fast_arith.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/ideal.py",
  "site-packages/sage/rings/ideal_monoid.py",
  "site-packages/sage/rings/integer.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/integer_ring.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/quotient_ring.py",
  "site-packages/sage/rings/quotient_ring_element.py",
  "site-packages/sage/rings/rational.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/rational_field.py",
  "site-packages/sage/rings/finite_rings/__init__.py",
  "site-packages/sage/rings/finite_rings/all.py",
  "site-packages/sage/rings/finite_rings/element_base.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/finite_rings/finite_field_base.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/finite_rings/finite_field_constructor.py",
  "site-packages/sage/rings/finite_rings/finite_field_prime_modn.py",
  "site-packages/sage/rings/finite_rings/integer_mod.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/finite_rings/integer_mod_ring.py",
  "site-packages/sage/rings/polynomial/__init__.py",
  "site-packages/sage/rings/polynomial/all.py",
  "site-packages/sage/rings/polynomial/polynomial_element.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/polynomial/polynomial_element_generic.py",
  "site-packages/sage/rings/polynomial/polynomial_integer_dense_flint.py",
  "site-packages/sage/rings/polynomial/polynomial_ring.py",
  "site-packages/sage/rings/polynomial/polynomial_ring_constructor.py",
  "site-packages/sage/rings/polynomial/polynomial_rational_flint.py",
  "site-packages/sage/rings/polynomial/polynomial_zmod_flint.py",
  "site-packages/sage/libs/__init__.py",
  "site-packages/sage/libs/flint/__init__.py",
  "site-packages/sage/libs/flint/flint_sage.cpython-314-wasm32-wasi.so",
  "site-packages/sage/libs/flint/fmpz_poly.cpython-314-wasm32-wasi.so",
  "site-packages/sage/libs/flint/fmpz_poly_sage.cpython-314-wasm32-wasi.so",
  "site-packages/sage/misc/lazy_import.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/__init__.py",
  "site-packages/sage/matrix/action.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/all.py",
  "site-packages/sage/matrix/args.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/berlekamp_massey.py",
  "site-packages/sage/matrix/constructor.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix0.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix1.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix2.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix_dense.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix_generic_dense.cpython-314-wasm32-wasi.so",
  "site-packages/sage/matrix/matrix_misc.py",
  "site-packages/sage/matrix/matrix_space.py",
  "site-packages/sage/matrix/special.py",
  "site-packages/sage/modules/__init__.py",
  "site-packages/sage/modules/free_module.py",
  "site-packages/sage/modules/free_module_element.cpython-314-wasm32-wasi.so",
  "site-packages/sage/modules/module.cpython-314-wasm32-wasi.so",
  "site-packages/sage/groups/__init__.py",
  "site-packages/sage/groups/group.cpython-314-wasm32-wasi.so",
  "site-packages/sage/groups/abelian_gps/__init__.py",
  "site-packages/sage/groups/abelian_gps/abelian_group.py",
  "site-packages/sage/groups/abelian_gps/abelian_group_element.py",
  "site-packages/sage/groups/abelian_gps/element_base.py",
  "site-packages/sage/monoids/__init__.py",
  "site-packages/sage/monoids/free_abelian_monoid.py",
  "site-packages/sage/monoids/free_abelian_monoid_element.cpython-314-wasm32-wasi.so",
  "site-packages/sage/monoids/monoid.py",
  "site-packages/sage/coding/__init__.py",
  "site-packages/sage/coding/abstract_code.py",
  "site-packages/sage/coding/decoder.py",
  "site-packages/sage/coding/encoder.py",
  "site-packages/sage/coding/hamming_code.py",
  "site-packages/sage/coding/information_set_decoder.py",
  "site-packages/sage/coding/linear_code.py",
  "site-packages/sage/coding/linear_code_no_metric.py",
  "site-packages/sage/combinat/SJT.py",
  "site-packages/sage/combinat/__init__.py",
  "site-packages/sage/combinat/backtrack.py",
  "site-packages/sage/combinat/combinat.py",
  "site-packages/sage/combinat/combinat_cython.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/combination.py",
  "site-packages/sage/combinat/combinatorial_map.py",
  "site-packages/sage/combinat/composition.py",
  "site-packages/sage/combinat/composition_signed.py",
  "site-packages/sage/combinat/derangements.py",
  "site-packages/sage/combinat/integer_lists/__init__.py",
  "site-packages/sage/combinat/integer_lists/base.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/integer_lists/invlex.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/integer_lists/lists.py",
  "site-packages/sage/combinat/integer_vector.py",
  "site-packages/sage/combinat/integer_vector_weighted.py",
  "site-packages/sage/combinat/partition.py",
  "site-packages/sage/combinat/partition_tuple.py",
  "site-packages/sage/combinat/partitions.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/perfect_matching.py",
  "site-packages/sage/combinat/permutation.py",
  "site-packages/sage/combinat/permutation_cython.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/set_partition.py",
  "site-packages/sage/combinat/set_partition_iterator.cpython-314-wasm32-wasi.so",
  "site-packages/sage/combinat/subword.py",
  "site-packages/sage/combinat/subset.py",
  "site-packages/sage/combinat/tableau.py",
  "site-packages/sage/combinat/tools.py",
  "site-packages/sage/sets/__init__.py",
  "site-packages/sage/sets/disjoint_union_enumerated_sets.py",
  "site-packages/sage/sets/family.cpython-314-wasm32-wasi.so",
  "site-packages/sage/sets/finite_enumerated_set.py",
  "site-packages/sage/sets/integer_range.py",
  "site-packages/sage/sets/non_negative_integers.py",
  "site-packages/sage/sets/positive_integers.py",
  "site-packages/sage/sets/pythonclass.cpython-314-wasm32-wasi.so",
  "site-packages/sage/sets/recursively_enumerated_set.cpython-314-wasm32-wasi.so",
  "site-packages/sage/sets/set.py",
  "site-packages/sage/misc/cachefunc.cpython-314-wasm32-wasi.so",
  "site-packages/sage/misc/persist.cpython-314-wasm32-wasi.so",
  "site-packages/sage/rings/infinity.py",
  "site-packages/sage/structure/list_clone.cpython-314-wasm32-wasi.so",
  "deps/cypari2/cypari2/__init__.py",
  "deps/cypari2/cypari2/_pari_cython_probe.cpython-314-wasm32-wasi.so",
  "deps/cypari2/cypari2/_pari_runtime_probe.cpython-314-wasm32-wasi.so",
  "deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so",
  "deps/cypari2/cypari2/handle_error.py",
  "deps/cypari2/cypari2/pari_instance.py",
  "deps/primecountpy/primecountpy/__init__.py",
  "deps/primecountpy/primecountpy/primecount.cpython-314-wasm32-wasi.so",
  "deps/cysignals/cysignals/__init__.py",
  "deps/cysignals/cysignals/signals.cpython-314-wasm32-wasi.so",
  "deps/memory_allocator/memory_allocator/__init__.py",
  "deps/memory_allocator/memory_allocator/memory_allocator.cpython-314-wasm32-wasi.so",
  "deps/gmpy2/gmpy2/__init__.py",
  "deps/gmpy2/gmpy2/gmpy2.cpython-314-wasm32-wasi.so",
  "deps/jinja2/jinja2/__init__.py",
  "deps/jinja2/markupsafe/__init__.py",
  "deps/platformdirs/platformdirs/__init__.py",
  "deps/platformdirs/platformdirs/_xdg.py",
  "deps/platformdirs/platformdirs/api.py",
  "deps/platformdirs/platformdirs/unix.py",
  "deps/platformdirs/platformdirs/version.py",
  "deps/numpy/numpy/__init__.pyc",
  "deps/numpy/numpy/core/__init__.pyc",
  "deps/numpy/numpy/core/multiarray.pyc",
  "deps/numpy/numpy/core/_multiarray_umath.cpython-314-wasm32-wasi.so",
  "deps/cython/Cython/__init__.pyc",
  "python.wasm",
  ...expectedSageliteRequiredToolPaths,
]);

const expectedSagelitePythonPath = Object.freeze([
  "site-packages",
  ...expectedSageliteRuntimeDependencyPaths,
]);

const expectedSageliteManifest = {
  schemaVersion: 67,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-rank-free-module-abelian-group-hamming-code-distance-power-tableau-set-partition-perfect-matching-derangements-subwords-enumeration-combinat-list-roundtrip-signed-composition-integer-lists-crt-valuation-quotient-ring-combinat-monoid-functional-cypari2-pari-error-recovery-sage-pari-boundary-resource-root-env-v33",
  resourceRootEnvName: "COWASM_SAGELITE_RESOURCE_ROOT",
};

const expectedSageliteManifestFields = Object.freeze([
  "schemaVersion",
  "resourceKind",
  "pythonAbi",
  "pythonPlatform",
  "smokeContract",
  "sageliteSourceRevision",
  "resourceRootEnvName",
  "pythonPath",
  "runtimeDependencyPaths",
  "requiredResourcePaths",
  "requiredResourceSha256",
  "nativeLibraryPaths",
  "sideModulePaths",
]);

function loadSageliteManifest(resourceRoot) {
  const manifestPath = join(resourceRoot, sageliteManifestName);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  validateSageliteManifest(resourceRoot, manifestPath, manifest);
  return manifest;
}

function sagelitePythonPath(manifest) {
  return manifest.pythonPath.join(":");
}

function sagelitePythonEnv(manifest, resourceRoot) {
  return {
    PYTHONPATH: sagelitePythonPath(manifest),
    ...(resourceRoot == null
      ? {}
      : { [manifest.resourceRootEnvName]: resourceRoot }),
  };
}

function validateSageliteManifest(resourceRoot, manifestPath, manifest) {
  validateSageliteResourceRoot(manifestPath, resourceRoot);
  validateSageliteManifestContract(manifestPath, manifest);
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "pythonPath",
    manifest.pythonPath,
    { requireDirectory: true, requireNonEmpty: true },
  );
  validateNoSymbolicEntriesUnderDirectories(
    resourceRoot,
    manifestPath,
    "pythonPath",
    manifest.pythonPath,
  );
  validateExpectedEntries(
    manifestPath,
    "pythonPath",
    manifest.pythonPath,
    expectedSagelitePythonPath,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "runtimeDependencyPaths",
    manifest.runtimeDependencyPaths,
    { requireDirectory: true, requireNonEmpty: true },
  );
  validateNoSymbolicEntriesUnderDirectories(
    resourceRoot,
    manifestPath,
    "runtimeDependencyPaths",
    manifest.runtimeDependencyPaths,
  );
  validateExpectedEntries(
    manifestPath,
    "runtimeDependencyPaths",
    manifest.runtimeDependencyPaths,
    expectedSageliteRuntimeDependencyPaths,
  );
  validatePythonPathMatchesRuntimeDependencies(
    manifestPath,
    manifest.pythonPath,
    manifest.runtimeDependencyPaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "requiredResourcePaths",
    manifest.requiredResourcePaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateRequiredResourceSha256(
    resourceRoot,
    manifestPath,
    manifest.requiredResourcePaths,
    manifest.requiredResourceSha256,
  );
  validateMandatoryResourcesCoveredByRequiredResources(
    manifestPath,
    manifest.requiredResourcePaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "nativeLibraryPaths",
    manifest.nativeLibraryPaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateExpectedEntries(
    manifestPath,
    "nativeLibraryPaths",
    manifest.nativeLibraryPaths,
    expectedSageliteNativeLibraryPaths,
  );
  validateNativeLibrariesCoveredByRequiredResources(
    manifestPath,
    manifest.nativeLibraryPaths,
    manifest.requiredResourcePaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "sideModulePaths",
    manifest.sideModulePaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateCompleteSideModuleInventory(
    resourceRoot,
    manifestPath,
    manifest.sideModulePaths,
  );
  validateNativeLibrariesInSideModuleInventory(
    manifestPath,
    manifest.nativeLibraryPaths,
    manifest.sideModulePaths,
  );
}

function validateSageliteResourceRoot(manifestPath, resourceRoot) {
  if (lstatSync(resourceRoot).isSymbolicLink()) {
    throw new Error(`${manifestPath} resource root must not be a symbolic link`);
  }
}

function validateSageliteManifestContract(manifestPath, manifest) {
  validateSageliteManifestFields(manifestPath, manifest);
  for (const [fieldName, expectedValue] of Object.entries(
    expectedSageliteManifest,
  )) {
    const actualValue = manifest[fieldName];
    if (actualValue !== expectedValue) {
      throw new Error(
        `${manifestPath} has unsupported ${fieldName} ${JSON.stringify(
          actualValue,
        )}; expected ${JSON.stringify(expectedValue)}`,
      );
    }
  }
  validateSageliteSourceRevision(manifestPath, manifest.sageliteSourceRevision);
}

function validateSageliteManifestFields(manifestPath, manifest) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${manifestPath} must contain a Sagelite manifest object`);
  }
  const expectedFields = new Set(expectedSageliteManifestFields);
  const unexpectedFields = Object.keys(manifest).filter(
    (fieldName) => !expectedFields.has(fieldName),
  );
  if (unexpectedFields.length !== 0) {
    throw new Error(
      `${manifestPath} contains unsupported Sagelite manifest fields: ${unexpectedFields
        .sort()
        .join(", ")}`,
    );
  }
}

function validateSageliteSourceRevision(manifestPath, sourceRevision) {
  if (
    typeof sourceRevision !== "string" ||
    !/^[0-9a-f]{40}$/.test(sourceRevision)
  ) {
    throw new Error(
      `${manifestPath} sageliteSourceRevision must be a full git commit hash`,
    );
  }
}

function validateExpectedEntries(
  manifestPath,
  fieldName,
  entries,
  expectedEntries,
) {
  if (
    entries.length !== expectedEntries.length ||
    entries.some((entry, index) => entry !== expectedEntries[index])
  ) {
    throw new Error(
      `${manifestPath} ${fieldName} must match the Sagelite Electron runtime contract`,
    );
  }
}

function validatePythonPathMatchesRuntimeDependencies(
  manifestPath,
  pythonPath,
  runtimeDependencyPaths,
) {
  const expectedPythonPath = ["site-packages", ...runtimeDependencyPaths];
  validateExpectedEntries(
    manifestPath,
    "pythonPath",
    pythonPath,
    expectedPythonPath,
  );
}

function validateExistingRelativeEntries(
  resourceRoot,
  manifestPath,
  fieldName,
  entries,
  { requireDirectory = false, requireFile = false, requireNonEmpty },
) {
  if (!Array.isArray(entries)) {
    throw new Error(`${manifestPath} ${fieldName} must be an array`);
  }
  if (requireNonEmpty && entries.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty ${fieldName} array`);
  }
  validateRelativeManifestEntries(manifestPath, fieldName, entries);
  validateUniqueManifestEntries(manifestPath, fieldName, entries);
  for (const entry of entries) {
    const targetPath = join(resourceRoot, entry);
    if (!existsSync(targetPath)) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} does not exist`);
    }
    validateNoSymbolicPathComponents(
      resourceRoot,
      manifestPath,
      fieldName,
      entry,
    );
    const targetStat = statSync(targetPath);
    if (requireDirectory && !targetStat.isDirectory()) {
      throw new Error(
        `${manifestPath} ${fieldName} entry ${entry} must be a directory`,
      );
    }
    if (requireFile && !targetStat.isFile()) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} must be a file`);
    }
  }
}

function validateNoSymbolicPathComponents(
  resourceRoot,
  manifestPath,
  fieldName,
  entry,
) {
  const parts = entry.split("/");
  let targetPath = resourceRoot;
  for (const [index, part] of parts.entries()) {
    targetPath = join(targetPath, part);
    if (lstatSync(targetPath).isSymbolicLink()) {
      if (index === parts.length - 1) {
        throw new Error(
          `${manifestPath} ${fieldName} entry ${entry} must not be a symbolic link`,
        );
      }
      const symbolicComponent = parts.slice(0, index + 1).join("/");
      throw new Error(
        `${manifestPath} ${fieldName} entry ${entry} must not contain symbolic path component ${symbolicComponent}`,
      );
    }
  }
}

function validateNoSymbolicEntriesUnderDirectories(
  resourceRoot,
  manifestPath,
  fieldName,
  entries,
) {
  for (const entry of entries) {
    const targetPath = join(resourceRoot, entry);
    validateNoSymbolicEntriesUnderDirectory(
      resourceRoot,
      targetPath,
      manifestPath,
      fieldName,
    );
  }
}

function validateNoSymbolicEntriesUnderDirectory(
  resourceRoot,
  targetPath,
  manifestPath,
  fieldName,
) {
  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = join(targetPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `${manifestPath} ${fieldName} directory contains symbolic path ${relativePosixPathFromRoot(resourceRoot, entryPath)}`,
      );
    }
    if (entry.isDirectory()) {
      validateNoSymbolicEntriesUnderDirectory(
        resourceRoot,
        entryPath,
        manifestPath,
        fieldName,
      );
    }
  }
}

function relativePosixPathFromRoot(resourceRoot, targetPath) {
  return targetPath
    .slice(resourceRoot.length + 1)
    .split(/[\\/]+/)
    .join("/");
}

function validateRelativeManifestEntries(manifestPath, fieldName, entries) {
  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${manifestPath} contains an invalid ${fieldName} entry`);
    }
    const parts = entry.split("/");
    if (
      isAbsolute(entry) ||
      entry.includes(":") ||
      entry.includes("\\") ||
      parts.some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new Error(
        `${manifestPath} ${fieldName} entries must be root-local POSIX relative paths`,
      );
    }
  }
}

function validateUniqueManifestEntries(manifestPath, fieldName, entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry)) {
      throw new Error(
        `${manifestPath} ${fieldName} entries must not contain duplicates`,
      );
    }
    seen.add(entry);
  }
}

function validateRequiredResourceSha256(
  resourceRoot,
  manifestPath,
  requiredResourcePaths,
  requiredResourceSha256,
) {
  if (
    requiredResourceSha256 === null ||
    typeof requiredResourceSha256 !== "object" ||
    Array.isArray(requiredResourceSha256)
  ) {
    throw new Error(`${manifestPath} requiredResourceSha256 must be an object`);
  }
  const expectedPaths = [...requiredResourcePaths].sort();
  const actualPaths = Object.keys(requiredResourceSha256).sort();
  if (
    actualPaths.length !== expectedPaths.length ||
    actualPaths.some((entry, index) => entry !== expectedPaths[index])
  ) {
    throw new Error(
      `${manifestPath} requiredResourceSha256 keys must match requiredResourcePaths`,
    );
  }
  for (const entry of requiredResourcePaths) {
    const expectedDigest = requiredResourceSha256[entry];
    if (
      typeof expectedDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(expectedDigest)
    ) {
      throw new Error(
        `${manifestPath} requiredResourceSha256 entry ${entry} must be a lowercase sha256 hex digest`,
      );
    }
    const actualDigest = createHash("sha256")
      .update(readFileSync(join(resourceRoot, entry)))
      .digest("hex");
    if (actualDigest !== expectedDigest) {
      throw new Error(
        `${manifestPath} requiredResourceSha256 entry ${entry} does not match copied resource`,
      );
    }
  }
}

function relativePosixPath(parts) {
  return parts.join("/");
}

function collectSideModulePaths(root, current = root, pathParts = []) {
  const sideModulePaths = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === "..") {
      continue;
    }
    const entryPath = join(current, entry.name);
    const entryPathParts = [...pathParts, entry.name];
    if (entry.isDirectory()) {
      sideModulePaths.push(
        ...collectSideModulePaths(root, entryPath, entryPathParts),
      );
    } else if (entry.isFile() && entry.name.endsWith(".so")) {
      sideModulePaths.push(relativePosixPath(entryPathParts));
    }
  }
  return sideModulePaths.sort();
}

function validateCompleteSideModuleInventory(
  resourceRoot,
  manifestPath,
  sideModulePaths,
) {
  const manifestSideModules = [...sideModulePaths].sort();
  const actualSideModules = collectSideModulePaths(resourceRoot);
  if (
    manifestSideModules.length !== actualSideModules.length ||
    manifestSideModules.some((entry, index) => entry !== actualSideModules[index])
  ) {
    throw new Error(
      `${manifestPath} sideModulePaths must list every copied .so resource`,
    );
  }
}

function validateNativeLibrariesInSideModuleInventory(
  manifestPath,
  nativeLibraryPaths,
  sideModulePaths,
) {
  const sideModulePathSet = new Set(sideModulePaths);
  const missingNativeLibraries = nativeLibraryPaths.filter(
    (entry) => !sideModulePathSet.has(entry),
  );
  if (missingNativeLibraries.length !== 0) {
    throw new Error(
      `${manifestPath} nativeLibraryPaths entries must also be listed in sideModulePaths`,
    );
  }
}

function validateNativeLibrariesCoveredByRequiredResources(
  manifestPath,
  nativeLibraryPaths,
  requiredResourcePaths,
) {
  const requiredResourcePathSet = new Set(requiredResourcePaths);
  const missingNativeLibraries = nativeLibraryPaths.filter(
    (entry) => !requiredResourcePathSet.has(entry),
  );
  if (missingNativeLibraries.length !== 0) {
    throw new Error(
      `${manifestPath} nativeLibraryPaths entries must also be listed in requiredResourcePaths`,
    );
  }
}

function validateMandatoryResourcesCoveredByRequiredResources(
  manifestPath,
  requiredResourcePaths,
) {
  const requiredResourcePathSet = new Set(requiredResourcePaths);
  const missingResourcePaths = expectedSageliteMandatoryResourcePaths.filter(
    (entry) => !requiredResourcePathSet.has(entry),
  );
  if (missingResourcePaths.length !== 0) {
    throw new Error(
      `${manifestPath} requiredResourcePaths must include the Sagelite Electron mandatory resources`,
    );
  }
}

module.exports = {
  expectedSageliteManifest,
  expectedSageliteMandatoryResourcePaths,
  expectedSageliteNativeLibraryPaths,
  expectedSagelitePythonPath,
  expectedSageliteRequiredToolPaths,
  expectedSageliteRuntimeDependencyPaths,
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonEnv,
  sagelitePythonPath,
  validateRelativeManifestEntries,
  validateRequiredResourceSha256,
  validateSageliteManifest,
  validateSageliteManifestContract,
  validateSageliteManifestFields,
  validateUniqueManifestEntries,
};
