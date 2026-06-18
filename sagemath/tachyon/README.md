# Tachyon for CoWasm

This package builds the SageMath Tachyon 0.99.5 source archive as a WASI
command-line ray tracer.

SageMath uses Tachyon for 3D scene rendering. The current WASI smoke applies a
small `sincos` fallback patch for WASI, builds the upstream Unix target with
the pinned wasi-sdk toolchain, installs the `tachyon` executable and a sample
scene, and verifies that the executable renders a nonempty binary PPM image
under the WASI runner.
