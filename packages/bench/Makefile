python-wasm-debug:
	echo "Starting benchmarks with python-wasm-debug"
	../../bin/python-wasm-debug `pwd`/src/all.py

python-wasm:
	echo "Starting benchmarks with python-wasm"
	../../bin/python-wasm `pwd`/src/all.py

python-native:
	echo "Starting benchmarks with python-native"
	../../bin/python-native `pwd`/src/all.py

python-lang:
	echo "Starting benchmarks with python-lang"
	./node_modules/.bin/python-lang `pwd`/src/all.py

pypy:
	echo "Starting benchmarks with pypy"
	pypy3 `pwd`/src/all.py

all:
	npm ci

# Running all the benchmark programs tests something about python-wasm actually working.
test:
	make python-wasm-debug
	make python-wasm

clean:
	rm -rf src/__pycache__