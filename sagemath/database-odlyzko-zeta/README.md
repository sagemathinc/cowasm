# Odlyzko Zeta-Zero Database For SageMath

This package provides SageMath's `database_odlyzko_zeta` data package for
CoWasm. It installs Andrew Odlyzko's `zeros6` table under
`share/odlyzko_zeta`, matching Sage's runtime data layout.

The table contains the first 2,001,052 nontrivial zeros of the Riemann zeta
function on the critical line, accurate to within `4e-9`.

The test target verifies that the data file is installed, has the expected
number of rows, and contains representative beginning and ending zeros under
CoWasm CPython.
