include ../build/Makefile-vars

wasm-debug:
	echo "Starting benchmarks with python-wasm-debug"
	python-wasm-debug src/all.py

wasm:
	echo "Starting benchmarks with python-wasm"
	python-wasm src/all.py

native:
	echo "Starting benchmarks with python-native"
	python-native src/all.py

pylang:
	echo "Starting benchmarks with pylang"
	npx --yes pylang src/all.py

pypy3:
	echo "Starting benchmarks with pypy (you must install pypy3 yourself)"
	pypy3 src/all.py

# Running all the benchmark programs tests something about python-wasm actually working.
test:
	make wasm-debug
	make wasm

.PHONY: clean
clean:
	rm -rf src/__pycache__

clean-build: clean
