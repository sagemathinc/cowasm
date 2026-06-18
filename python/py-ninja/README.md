# Ninja for CoWasm build probes

This packages a host-side Linux x86_64 Ninja wheel for Meson-driven CoWasm
build probes such as `sagemath/sagelite`.

It intentionally exposes only the native `ninja` executable through the
repository `bin` directory; it is not a WebAssembly runtime package.
