python-wasm-debug:
	echo "Starting benchmarks with python-wasm-debug"
	../../bin/python-wasm-debug src/all.py

python-wasm:
	echo "Starting benchmarks with python-wasm"
	../../bin/python-wasm src/all.py

python-native:
	echo "Starting benchmarks with python-native"
	../../bin/python-native src/all.py

pylang:
	echo "Starting benchmarks with pylang"
	npx --yes pylang src/all.py

pypy:
	echo "Starting benchmarks with pypy"
	pypy3 src/all.py

all:
	npm ci

# Running all the benchmark programs tests something about python-wasm actually working.
test:
	make python-wasm-debug
	make python-wasm

clean:
	rm -rf src/__pycache__