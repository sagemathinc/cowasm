all: build bench

build:
	zython-dev setup.py build
.PHONY: build

bench:
	zython-dev all.py

clean:
	rm -rf *.c build