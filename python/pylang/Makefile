CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: build

.PHONY: build
build:
	npm install
	npm run build

.PHONY: test
test: build
	npm run test

clean:
	rm -rf ${DIST} node_modules
