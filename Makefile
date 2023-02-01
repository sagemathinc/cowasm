BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE = $(dir $(shell ls core/*/Makefile))
PYTHON = $(dir $(shell ls python/*/Makefile))
WEB = $(dir $(shell ls web/*/Makefile))

ALL = ${CORE} ${PYTHON} ${WEB}

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

# Test

.PHONY: test
test:
	./bin/make-all test ${ALL}

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
