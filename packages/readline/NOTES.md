I obviously didn't yet figure out how to build readline for WASM.  I don't even know
if it is possible/impossible/easy/hard...

One thing though -- the native build has an example in
```sh
build/native/examples/rlfe
```

and if you build that then do

```sh
~/sagemathjs/packages/readline/build/native/examples/rlfe$ ./rlfe wasmer run /home/user/sagemathjs/packages/pari/dist/wasm/bin/gp-sta.wasm  --mapdir /:/ 
```

then you get a much more usable version of the wasm pari.  Obviously there is
no tab completion, but at least you can edit the line you're about to input.
