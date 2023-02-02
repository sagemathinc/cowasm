# GMP

This is 32-bit GMP compiled (fPIC) for web assembly.

## Note about 64-bit:

I learned from

https://github.com/torquem-ch/gmp-wasm/commit/48fec192ca77d2a8a874f973f469d4c16b21f034

how to enable 64-bit limbs. In some benchmarks, this VERY significantly
improves the speed (it's over twice as fast). See https://github.com/sagemathinc/JSage/tree/main/packages/gmp if you want to try this. I also found that it leads to weird random bugs in client libraries, e.g., FLINT,
and is generally probably a very bad idea at present, unfortunately.

Another thing I learned is that Javascript (in V8 at least) itself has native very fast BigInts these days. However, GMP is of course much more than just arithmetic.
