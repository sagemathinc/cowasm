CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
SRC = ${CWD}/src
DIST = ${CWD}/dist
OPTS = -mcpu=baseline -OReleaseSmall
SOURCES = src/

all: ${DIST}/.built

${DIST}/.built: dist/index.js dist/aarch64-macos.node dist/x86_64-macos.node dist/aarch64-linux-gnu.node dist/x86_64-linux-gnu.node
	touch dist/.built

build/headers:
	rm -rf ${BUILD}/headers
	mkdir -p ${BUILD}/headers
	curl --silent --progress-bar --output ${BUILD}/headers.tar.gz `node -p 'process.release.headersUrl'`
	cd ${BUILD} && tar xf headers.tar.gz -C headers --strip-components=1
	rm ${BUILD}/headers.tar.gz

node_modules:
	npm ci

dist/index.js: src/index.ts node_modules
	npx tsc -b

# Make an "automatic rules pattern".
dist/%.node: build/headers $(shell find src -type f)
	mkdir -p ${DIST}
	zig build-lib ${OPTS} --cache-dir ${BUILD}/zig-cache -dynamic -lc -isystem ${BUILD}/headers/include/node ${SRC}/lib.zig -fallow-shlib-undefined -target $* -femit-bin=$@

dist/aarch64-macos.node:
dist/x86_64-macos.node:
dist/aarch64-linux-gnu.node:
dist/x86_64-linux-gnu.node:

test: all
	npx tsc -b
	npm run test

clean:
	rm -rf ${BUILD} ${DIST} tsconfig.tsbuildinfo
