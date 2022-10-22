# Libarchive: tar-wasm

This is the BSD version of tar, built to run in WebAssembly via CoWasm.

There are of course issues, given that WASI makes it impossible to properly
support chmod (the struct is too small!).

Creating a tarball currently fails with a wasi error:
```sh
tar: statvfs failed: Invalid argument
```

It's fast to extract tarballs, with the caveat that filesystem modes are messed
up as mentioned above.