include ../build/Makefile-vars
include ../build/Makefile-rules

# TODO
all:
	echo "Nothing  yet -- could be install later."

python-wasm: deps
	echo "Starting benchmarks with python-wasm"
	pnpm dlx python-wasm src/all.py

pylang: deps
	echo "Starting benchmarks with pylang"
	pnpm dlx pylang src/all.py

native:
	cd ../cpython && make native
	echo "Starting benchmarks with python-native"
	${BIN}/python-native src/all.py

pypy3:
	echo "Starting benchmarks with pypy (you must install pypy3 yourself)"
	pypy3 src/all.py

# Running all the benchmark programs tests something about python-wasm actually working.
test:
	make python-wasm
	##cd src/cython && make all  # good test of cython

.PHONY: clean
clean::
	rm -rf src/__pycache__

clean-build:: clean
