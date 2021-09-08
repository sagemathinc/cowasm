# GNU Multiprecision Arithmetic

## Quickstart

Install the package

```sh
$ npm i @sagemath/gmp
```

There's nothing you can directly do with this yet.

## Build from source

You need to install [emscripten](https://emscripten.org/docs/getting_started/downloads.html). Then do

```
npm run build
```

This will download and build GMP from source.

## TODO

### Automate running the test suite.

Good news -- I _did_ run it (as below) with a build and it fully passes (I didn't run everything in mpz). 

In particular, `make check` currently doesn't run because the output of `emcc ... -o foo` can't be run via `./foo` .   However, if you try `make check` in the build directory, then (with `make-executable.sh` as below ):

```sh
$ ls --ignore='*.*' | grep ^t- | xargs make-executable.sh
```

That makes all the outputs from emcc executable; you can then type `make check` again and the test suite runs.  I tediously did this and all tests pass.

Here is `make-executable.sh`  

```sh
#!/usr/bin/env bash

# Given some scripts built using emscripten, modify them
# so they are executable.

sed -i '1s/^/#!\/usr\/bin\/env node \n/' "$@"
chmod +x "$@"
```

Probably a much better way is to patch the autoconf script to run the tests as \`node ./testfile\`.
