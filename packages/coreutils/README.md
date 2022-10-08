# BSD Coreutils Ported to WebAssembly

For use in https://zython.org

This code comes from https://github.com/DiegoMagdaleno/BSDCoreUtils, but with changes to make it work in WebAssembly.

We aren't porting everything, e.g., `chroot` is basically some sort of security mechanism that doesn't make a lot of sense in the context of WebAssembly/WASI.