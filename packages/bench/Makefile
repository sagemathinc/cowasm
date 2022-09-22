include ../build/Makefile-vars

zython-debug:
	echo "Starting benchmarks with zython-debug"
	zython-debug src/all.py

zython:
	echo "Starting benchmarks with zython"
	zython src/all.py

native:
	echo "Starting benchmarks with python-native"
	python-native src/all.py

pylang:
	echo "Starting benchmarks with pylang"
	npx --yes pylang src/all.py

pypy3:
	echo "Starting benchmarks with pypy (you must install pypy3 yourself)"
	pypy3 src/all.py

# Running all the benchmark programs tests something about zython actually working.
test:
	make zython-debug
	make zython

.PHONY: clean
clean:
	rm -rf src/__pycache__

clean-build: clean
