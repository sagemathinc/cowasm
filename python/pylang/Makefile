CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: dist

node_modules:
	pnpm install

dist: node_modules
	pnpm run build

.PHONY: test
test: dist
	pnpm run test

clean:
	rm -rf ${DIST} node_modules
