# ratpoints

ratpoints searches for rational points on hyperelliptic curves. SageMath uses
it in arithmetic geometry code that needs fast bounded-height point searches.

This package builds the wasi-sdk standalone `libratpoints.a` archive and the
`ratpoints` command-line tool against the existing CoWasm GMP port. The smoke
test runs upstream's `rptest` probe and verifies a known set of rational
points on `y^2 = x` up to height 10 under the WASI runner.
