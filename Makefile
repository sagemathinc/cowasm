BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE = $(dir $(shell ls core/*/Makefile))
PYTHON = $(dir $(shell ls python/*/Makefile))
PYTHON_DISABLED =
PYTHON_SUPPORTED = $(filter-out ${PYTHON_DISABLED},${PYTHON})
WEB = $(dir $(shell ls web/*/Makefile))
DESKTOP = $(dir $(shell ls desktop/*/Makefile))
SAGEMATH = $(dir $(shell ls sagemath/*/Makefile))

ALL = ${CORE} ${PYTHON} ${WEB} ${DESKTOP} ${SAGEMATH}

export PATH := ${CWD}/bin:${CWD}/core/zig/dist:$(PATH)

all: packages

.PHONY: audit-sources
audit-sources:
	./bin/audit-tarball-checksums ${CWD}

.PHONY: fetch-sources
fetch-sources:
	./bin/fetch-sources ${CWD}

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

.PHONY: python-supported
python-supported:
	./bin/make-all all ${PYTHON_SUPPORTED}

.PHONY: test-python-supported
test-python-supported: python-supported
	./bin/make-all test ${PYTHON_SUPPORTED}

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

.PHONY: test-wasi-sdk
test-wasi-sdk: test-wasi-sdk-bootstrap test-wasi-sdk-dylink test-wasi-sdk-packages test-wasi-sdk-python test-wasi-sdk-math

.PHONY: test-wasi-sdk-bootstrap
test-wasi-sdk-bootstrap:
	$(MAKE) -C core/build test-wasi-sdk-next

.PHONY: test-wasi-sdk-dylink
test-wasi-sdk-dylink:
	$(MAKE) -C core/dylink test-wasi-sdk-next

.PHONY: test-wasi-sdk-packages
test-wasi-sdk-packages:
	$(MAKE) -C core/posix-wasm test-wasi-sdk-standalone
	$(MAKE) -C core/zlib test-wasi-sdk-standalone
	$(MAKE) -C core/bzip2 test-wasi-sdk-standalone
	$(MAKE) -C core/lzma test-wasi-sdk-next
	$(MAKE) -C core/sqlite test-wasi-sdk-next
	$(MAKE) -C core/termcap test-wasi-sdk-standalone
	$(MAKE) -C core/lua test-wasi-sdk-next
	$(MAKE) -C core/libedit test-wasi-sdk-next
	$(MAKE) -C core/ncurses test-wasi-sdk-next
	$(MAKE) -C core/less test-wasi-sdk-next
	$(MAKE) -C core/tar test-wasi-sdk-next
	$(MAKE) -C core/openssl test-wasi-sdk-next
	$(MAKE) -C core/libgit2 test-wasi-sdk-next
	$(MAKE) -C core/libpng test-wasi-sdk-standalone
	$(MAKE) -C core/freetype test-wasi-sdk-standalone
	$(MAKE) -C core/libffi test-wasi-sdk-next
	$(MAKE) -C core/qhull test-wasi-sdk-standalone
	$(MAKE) -C core/libcxx test-wasi-sdk-standalone
	$(MAKE) -C core/dash test-wasi-sdk-standalone
	$(MAKE) -C core/rogue test-wasi-sdk-standalone
	$(MAKE) -C core/man test-wasi-sdk-standalone
	$(MAKE) -C core/coreutils test-wasi-sdk-standalone
	$(MAKE) -C core/f2c test-wasi-sdk-standalone

.PHONY: test-wasi-sdk-python
test-wasi-sdk-python:
	$(MAKE) -C python/cpython test-wasi-sdk-supported

.PHONY: test-wasi-sdk-math
test-wasi-sdk-math:
	$(MAKE) -C sagemath/gmp test-wasi-sdk-next
	$(MAKE) -C sagemath/mpfr test-wasi-sdk-standalone
	$(MAKE) -C sagemath/mpc test-wasi-sdk-standalone
	$(MAKE) -C sagemath/pari test-wasi-sdk-standalone

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
