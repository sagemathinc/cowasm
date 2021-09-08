BUILT = dist/.built

all: packages/gmp/${BUILT} packages/mpir/${BUILT} packages/mpfr/${BUILT} packages/mpc/${BUILT}

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


clean:
	cd packages/gmp && make clean
	cd packages/mpir && make clean

