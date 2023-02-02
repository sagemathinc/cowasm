BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE = $(dir $(shell ls core/*/Makefile))
PYTHON = $(dir $(shell ls python/*/Makefile))
WEB = $(dir $(shell ls web/*/Makefile))
DESKTOP = $(dir $(shell ls desktop/*/Makefile))
SAGEMATH = $(dir $(shell ls sagemath/*/Makefile))

ALL = ${CORE} ${PYTHON} ${WEB} ${DESKTOP} ${SAGEMATH}

export PATH := ${CWD}/bin:${CWD}/core/zig/dist:$(PATH)

all: packages

# All

.PHONY: packages
packages:
	./bin/make-all all ${ALL}

.PHONY: test-packages
test-packages: packages
	./bin/make-all test ${ALL}

.PHONY: clean-packages
clean-packages:
	./bin/make-all clean ${ALL}


# Core

.PHONY: core
core:
	./bin/make-all all ${CORE}

.PHONY: test-core
test-core: core
	./bin/make-all test ${CORE}

.PHONY: clean-core
clean-core:
	./bin/make-all clean ${CORE}

# Python

.PHONY: python
python:
	./bin/make-all all ${PYTHON}

.PHONY: test-python
test-python: python
	./bin/make-all test ${PYTHON}

.PHONY: clean-python
clean-python:
	./bin/make-all clean ${PYTHON}


# Web

.PHONY: web
web:
	./bin/make-all all ${WEB}

.PHONY: test-web
test-web: web
	./bin/make-all test ${WEB}

.PHONY: clean-web
clean-web:
	./bin/make-all clean ${WEB}

# Desktop

.PHONY: desktop
desktop:
	./bin/make-all all ${DESKTOP}

.PHONY: test-desktop
test-desktop: desktop
	./bin/make-all test ${DESKTOP}

.PHONY: clean-desktop
clean-desktop:
	./bin/make-all clean ${DESKTOP}


# SageMath

.PHONY: sagemath
sagemath:
	./bin/make-all all ${SAGEMATH}

.PHONY: test-sagemath
test-sagemath: sagemath
	./bin/make-all test ${SAGEMATH}

.PHONY: clean-sagemath
clean-sagemath:
	./bin/make-all clean ${SAGEMATH}


# Test

.PHONY: test
test: all test-bin
	./bin/make-all test ${ALL}

test-bin: all
	# Some tests of the top level scripts
	# That wasm python runs
	./bin/python-wasm -c "print('hi')" | grep hi
	# That native python runs
	./bin/python-native -c "print('hi')" | grep hi
	# That the cowasm script can run a wasm binary
	./bin/cowasm core/coreutils/dist/wasm/bin/factor 2023 | grep "7 17 17"
	# That cython script starts
	./bin/cython --version
	# That dash-wasm runs
	echo "factor 2023" | ./bin/dash-wasm  |grep "7 17 17"
	# Wasm version of lua works:
	./bin/lua-wasm -e 'print(7*17*17)' |grep 2023
	# Native version of lua works:
	./bin/lua-native -e 'print(7*17*17)' |grep 2023
	# That sqlite3-wasm does something:
	./bin/sqlite3-wasm  --version

# clean up everything after each test, to prove can build and test everything
# in isolation.
.PHONY: test-clean
test-clean:
	./bin/make-all-clean test ${ALL}

# Clean

.PHONY: clean
clean:
	./bin/make-all clean ${ALL}
	rm -f bin/zig


docker:
	docker build --build-arg commit=`git rev-parse HEAD` -t cowasm .
.PHONY: docker
