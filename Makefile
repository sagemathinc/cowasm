BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

PACKAGE_DIRS = $(dir $(shell ls packages/*/Makefile))

all: python-wasm webpack terminal website

cpython: packages/cpython/${BUILT}
packages/cpython/${BUILT}: posix-wasm zlib lzma libedit zig wasi sqlite bzip2
	cd packages/cpython && make all
.PHONY: cpython

docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/python-wasm master | awk '{print $$1}'` -t python-wasm .
.PHONY: docker

docker-nocache:
	docker build --no-cache -t python-wasm .
.PHONY: docker-nocache

dylink: packages/dylink/${BUILT}
packages/dylink/${BUILT}: node zig posix-wasm cpython lzma
	cd packages/dylink && make all
.PHONY: dylink

libedit: packages/libedit/${BUILT}
packages/libedit/${BUILT}: zig termcap
	cd packages/libedit && make all
.PHONY: libedit

lzma: packages/lzma/${BUILT}
packages/lzma/${BUILT}: zig posix-wasm
	cd packages/lzma && make all
.PHONY: lzma

# this builds and you can make ncurses a dep for cpython and change src/Setup.local to get
# the _ncurses module to build. But there are still issues to solve (probably
# straightforward, but tedious) as mentioned in the cpython/src/Setup.local.
ncurses: packages/ncurses/${BUILT}
packages/ncurses/${BUILT}: termcap posix-wasm zig
	cd packages/ncurses && make all
.PHONY: ncurses

node:
	cd packages/node && make
.PHONY: node

openssl: packages/openssl/${BUILT}
packages/openssl/${BUILT}: zig
	cd packages/openssl && make all
.PHONY: openssl

posix-zig: packages/posix-zig/${BUILT}
packages/posix-zig/${BUILT}: zig node
	cd packages/posix-zig && make all
.PHONY: posix-zig

posix-wasm: packages/posix-wasm/${BUILT}
packages/posix-wasm/${BUILT}: zig
	cd packages/posix-wasm && make all
.PHONY: posix-wasm

python-wasm: packages/python-wasm/${BUILT}
packages/python-wasm/${BUILT}: node cpython wasi zig posix-wasm dylink posix-zig
	cd packages/python-wasm && make all
.PHONY: python-wasm

packages/sqlite/${BUILT}: libedit posix-wasm zig zlib
	cd packages/sqlite && make all
.PHONY: sqlite
sqlite: packages/sqlite/${BUILT}

termcap: packages/termcap/${BUILT}
packages/termcap/${BUILT}: zig
	cd packages/termcap && make all
.PHONY: termcap

terminal: packages/terminal/${BUILT}
packages/terminal/${BUILT}: node python-wasm
	cd packages/terminal && make all
.PHONY: terminal

wasi: packages/wasi/${BUILT}
packages/wasi/${BUILT}: node
	cd packages/wasi && make all
.PHONY: wasi

webpack: packages/webpack/${BUILT}
packages/webpack/${BUILT}: node python-wasm
	cd packages/webpack && make all
.PHONY: webpack

website: packages/website/${BUILT}
packages/website/${BUILT}: node python-wasm
	cd packages/website && make all
.PHONY: website

zig:
	cd packages/zig && make
.PHONY: zig

zlib: packages/zlib/${BUILT}
packages/zlib/${BUILT}: zig
	cd packages/zlib && make all
.PHONY: zlib

bzip2: packages/bzip2/${BUILT}
packages/bzip2/${BUILT}: zig
	cd packages/bzip2 && make all
.PHONY: bzip2

.PHONY: clean
clean:
	./bin/make-all clean ${PACKAGE_DIRS}

clean-build:
	./bin/make-all clean-build ${PACKAGE_DIRS}

test: test-cpython test-bench test-dylink test-posix-zig test-python-wasm
.PHONY: test

test-cpython: cpython python-wasm
	cd packages/cpython && make test

test-bench: python-wasm
	cd packages/bench && make test

test-dylink: dylink
	cd packages/dylink && make test

test-posix-zig: posix-zig
	cd packages/posix-zig && make test

test-python-wasm: python-wasm
	cd packages/python-wasm && make test
