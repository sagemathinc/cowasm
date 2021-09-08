BUILT = dist/.built

all: packages/gmp/${BUILT}

packages/gmp/${BUILT}:
	cd packages/gmp && make all

.PHONY: packages/gmp/${BUILT}

clean:
	cd packages/gmp && make clean

