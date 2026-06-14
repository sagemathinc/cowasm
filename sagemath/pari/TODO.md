This is just a very minimal first proof of concept build. It does work though, if you type

```sh
cd sagemath/pari
PATH=../../bin:$PATH ./dist/wasm/bin/gp
```

## [ ] Build dynamically linked

The current build is statically linked, so it can't be run as part of the dash shell.

## [ ] Support Readline (via editline + compat support or hacking)

My understanding is nobody has ever built pari using libedit, so this
could be a little challenging.

## [x] Support GMP for the static WASM build

WASM PARI is built against the sibling `sagemath/gmp` package. The package
test checks the startup banner so a regression back to the portable non-GMP
kernel is visible.

Here is how to tell if GMP is being used or not:

```sh
~/cowasm/sagemath/pari$ ./dist/wasm/bin/gp </dev/null | grep kernel
         wasm running wasi (portable C/GMP-6.2.1 kernel) 32-bit version
~/cowasm/sagemath/pari$ dist/native/bin/gp </dev/null | grep kernel
Reading GPRC: /etc/gprc
GPRC Done.

          amd64 running linux (x86-64/GMP-6.2.1 kernel) 64-bit version
```
