# Meson for CoWasm build probes

This packages the pure Python `meson` wheel for CoWasm build-system probes.

The package exposes a host-side `meson` wrapper through the repository `bin`
directory and keeps the Python module importable from `dist/wasm` for
`python-wasm` validation.
