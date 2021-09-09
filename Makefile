BUILT = dist/.built

all: packages/gmp/${BUILT} packages/mpir/${BUILT} packages/mpfr/${BUILT} packages/mpc/${BUILT} \
	 packages/gf2x/${BUILT} packages/ntl/${BUILT} packages/flint/${BUILT} packages/pari/${BUILT}

packages/gmp/${BUILT}:
	cd packages/gmp && make all
.PHONY: packages/gmp/${BUILT}

packages/mpir/${BUILT}:
	cd packages/mpir && make all
.PHONY: packages/mpir/${BUILT}

packages/mpfr/${BUILT}: packages/gmp/${BUILT}
	cd packages/mpfr && make all
.PHONY: packages/mpfr/${BUILT}

packages/mpc/${BUILT}: packages/gmp/${BUILT} packages/mpfr/${BUILT}
	cd packages/mpc && make all
.PHONY: packages/mpc/${BUILT}

packages/gf2x/${BUILT}:
	cd packages/gf2x && make all
.PHONY: packages/gf2x/${BUILT}

packages/ntl/${BUILT}: packages/gmp/${BUILT} packages/gf2x/${BUILT}
	cd packages/ntl && make all
.PHONY: packages/ntl/${BUILT}

packages/flint/${BUILT}: packages/gmp/${BUILT} packages/mpfr/${BUILT} packages/mpir/${BUILT} packages/ntl/${BUILT}
	cd packages/flint && make all
.PHONY: packages/flint/${BUILT}

packages/pari/${BUILT}: packages/gmp/${BUILT}
	cd packages/pari && make all
.PHONY: packages/pari/${BUILT}



clean:
	cd packages/gmp && make clean
	cd packages/mpir && make clean
	cd packages/mpfr && make clean
	cd packages/mpc && make clean
	cd packages/ntl && make clean
	cd packages/flint && make clean
	cd packages/pari && make clean

