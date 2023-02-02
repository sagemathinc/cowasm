WASM Pari is definitely being built without GMP.  This
is making it MUCH MUCH slower.

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