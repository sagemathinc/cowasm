# GMP 



## 64-bit

I learned from

https://github.com/torquem-ch/gmp-wasm/commit/48fec192ca77d2a8a874f973f469d4c16b21f034

how to enable 64-bit limbs.  In some benchmarks, this VERY significantly
improves the speed (it's over twice as fast).