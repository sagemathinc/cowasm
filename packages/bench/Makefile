include ../build/Makefile-vars

python-wasm:
	cd ../cpython && make wasm
	cd ../kernel && make
	echo "Starting benchmarks with python-wasm"
	${BIN}/python-wasm src/all.py

native:
	cd ../cpython && make native
	echo "Starting benchmarks with python-native"
	${BIN}/python-native src/all.py

pylang:
	echo "Starting benchmarks with pylang"
	npx --yes pylang src/all.py

pypy3:
	echo "Starting benchmarks with pypy (you must install pypy3 yourself)"
	pypy3 src/all.py

# Running all the benchmark programs tests something about python-wasm actually working.
test:
	make python-wasm
	##cd src/cython && make all  # good test of cython

.PHONY: clean
clean:
	rm -rf src/__pycache__

clean-build: clean
