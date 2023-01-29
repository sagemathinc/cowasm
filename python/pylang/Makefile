CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: build

.PHONY: build
build:
	pnpm install
	pnpm run build

.PHONY: test
test: build
	pnpm run test

clean:
	rm -rf ${DIST} node_modules
