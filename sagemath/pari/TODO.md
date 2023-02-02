This is just a very minimal first proof of concept build. It does work though, if you type

```sh
./dist/wasm/bin/gp
```

## [ ] Build dynamically linked

The current build is statically linked, so it can't be run as part of the dash shell.

## [ ] Support Readline (via editline + compat support or hacking)

My understanding is nobody has ever built pari using libedit, so this
could be a little challenging.

## [ ] Support GMP

WASM Pari is definitely being built without GMP right now, since we haven't
even tried. This is making it MUCH MUCH slower.

Here is how to tell if GMP is being used or not:

```sh
~/jsage/packages/pari$ make run-wasm</dev/null |grep kernel
              wasm running wasi (portable C kernel) 32-bit version
~/jsage/packages/pari$ dist/native/bin/gp </dev/null |grep kernel
Reading GPRC: /etc/gprc
GPRC Done.

          amd64 running linux (x86-64/GMP-6.2.1 kernel) 64-bit version
```

Note "portable C kernel" for the wasm version.
