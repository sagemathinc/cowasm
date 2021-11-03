BUILT = dist/.built

all: packages/gmp/${BUILT} packages/mpfr/${BUILT} packages/mpc/${BUILT} \
	 packages/gf2x/${BUILT} packages/ntl/${BUILT} packages/flint/${BUILT} packages/pari/${BUILT} \
	 packages/eclib/${BUILT} lib/${BUILT} packages/jpython/${BUILT}

packages/gmp/${BUILT}:
	cd packages/gmp && make all
.PHONY: gmp
gmp: packages/gmp/${BUILT}

packages/mpir/${BUILT}:
	cd packages/mpir && make all
.PHONY: mpir
mpir: packages/mpir/${BUILT}

packages/mpfr/${BUILT}: packages/gmp/${BUILT}
	cd packages/mpfr && make all
.PHONY: mpfr
mpfr: packages/mpfr/${BUILT}

packages/mpc/${BUILT}: packages/gmp/${BUILT} packages/mpfr/${BUILT}
	cd packages/mpc && make all
.PHONY: mpc
mpc: packages/mpc/${BUILT}

packages/gf2x/${BUILT}:
	cd packages/gf2x && make all
.PHONY: gf2x
gf2x: packages/gf2x/${BUILT}

packages/ntl/${BUILT}: packages/gmp/${BUILT} packages/gf2x/${BUILT}
	cd packages/ntl && make all
.PHONY: ntl
ntl: packages/ntl/${BUILT}

packages/flint/${BUILT}: packages/gmp/${BUILT} packages/mpfr/${BUILT} packages/ntl/${BUILT}
	cd packages/flint && make all
.PHONY: flint
flint: packages/flint/${BUILT}

packages/wasm-posix/${BUILT}:
	cd packages/wasm-posix && make all
.PHONY: wasm-posix
wasm-posix: packages/wasm-posix/${BUILT}

packages/pari/${BUILT}: packages/gmp/${BUILT} packages/wasm-posix/${BUILT}
	cd packages/pari && make all
.PHONY: pari
pari: packages/pari/${BUILT}

packages/eclib/${BUILT}: packages/gmp/${BUILT} packages/mpfr/${BUILT} packages/pari/${BUILT} packages/ntl/${BUILT} packages/flint/${BUILT}
	cd packages/eclib && make all
.PHONY: eclib
eclib: packages/eclib/${BUILT}

lib/${BUILT}: packages/gmp/${BUILT} packages/pari/${BUILT} packages/python/${BUILT}
	cd lib && make all
.PHONY: lib
lib: packages/lib/${BUILT}


# Included here since I did the work, but we're not using it.
packages/openssl/${BUILT}:
	cd packages/openssl && make all
.PHONY: openssl
openssl: packages/openssl/${BUILT}


packages/zlib/${BUILT}:
	cd packages/zlib && make all
.PHONY: zlib
zlib: packages/zlib/${BUILT}


packages/python/${BUILT}: packages/zlib/${BUILT} packages/wasm-posix/${BUILT}
	cd packages/python && make all
.PHONY: python
python: packages/python/${BUILT}

packages/jpython/${BUILT}:
	cd packages/jpython && make all
.PHONY: jpython
jpython: packages/jpython/${BUILT}

clean:
	cd packages/gmp && make clean
	cd packages/mpir && make clean
	cd packages/mpfr && make clean
	cd packages/mpc && make clean
	cd packages/ntl && make clean
	cd packages/flint && make clean
	cd packages/pari && make clean
	cd packages/eclib && make clean
	cd packages/jpython && make clean
	cd packages/python && make clean
	cd packages/openssl && make clean
	cd packages/zlib && make clean
	cd packages/wasm-posix && make clean
	cd lib && make clean

