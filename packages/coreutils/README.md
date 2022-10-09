# BSD Coreutils Ported to WebAssembly

For use in https://zython.org

This code comes from https://github.com/coreutils/coreutils and/or https://github.com/DiegoMagdaleno/BSDCoreUtils, but with changes to port to Zython-Zig-WebAssembly.

We aren't porting everything, e.g., `chroot` doesn't make a lot of sense in the context of WebAssembly/WASI.