all: build bench

build:
	python-wasm setup.py build
.PHONY: build

bench:
	python-wasm all.py

clean:
	rm -rf *.c build