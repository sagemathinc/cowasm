BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

PACKAGE_DIRS = $(dir $(shell ls packages/*/Makefile))

all: python-wasm webpack terminal website py f2c

cpython: packages/cpython/${BUILT}
packages/cpython/${BUILT}: posix-wasm zlib lzma libedit zig wasi-js sqlite bzip2 # openssl
	cd packages/cpython && make all
.PHONY: cpython
test-cpython: cpython python-wasm
	cd packages/cpython && make test

dash: packages/dash/${BUILT}
packages/dash/${BUILT}: zig
	cd packages/dash && make all
.PHONY: dash

docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/zython master | awk '{print $$1}'` -t zython .
.PHONY: docker

docker-nocache:
	docker build --no-cache -t zython .
.PHONY: docker-nocache

dylink: packages/dylink/${BUILT}
packages/dylink/${BUILT}: node zig posix-wasm cpython lzma
	cd packages/dylink && make all
.PHONY: dylink

test-dylink: dylink
	cd packages/dylink && make test

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
packages/openssl/${BUILT}: zig posix-wasm
	cd packages/openssl && make all
.PHONY: openssl

posix-node: packages/posix-node/${BUILT}
# note -- I tried doing 'make -j4' for posix-node and sometimes got segfaults on macos (bug in zig).
packages/posix-node/${BUILT}: zig node
	cd packages/posix-node && make all
.PHONY: posix-node

posix-wasm: packages/posix-wasm/${BUILT}
packages/posix-wasm/${BUILT}: zig
	cd packages/posix-wasm && make all
.PHONY: posix-wasm
test-posix-node: posix-node
	cd packages/posix-node && make test

python-wasm: packages/python-wasm/${BUILT}
packages/python-wasm/${BUILT}: node wasi-js zig posix-wasm dylink posix-node libgit2
	cd packages/python-wasm && make all
.PHONY: python-wasm
test-python-wasm: python-wasm
	cd packages/python-wasm && make test

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

vis: packages/vis/${BUILT}
packages/vis/${BUILT}: termcap ncurses zig
	cd packages/vis && make all
.PHONY: vis



wasi-js: packages/wasi-js/${BUILT}
packages/wasi-js/${BUILT}: node
	cd packages/wasi-js && make all
.PHONY: wasi-js

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

libgit2: packages/libgit2/${BUILT}
packages/libgit2/${BUILT}: zig
	cd packages/libgit2 && make all
.PHONY: libgit2

bzip2: packages/bzip2/${BUILT}
packages/bzip2/${BUILT}: zig
	cd packages/bzip2 && make all
.PHONY: bzip2

f2c: packages/f2c/${BUILT} wasi-js zig
packages/f2c/${BUILT}: zig
	cd packages/f2c && make all
.PHONY: f2c
test-f2c: f2c
	cd packages/f2c && make test


py: py-cython py-mpmath py-sympy py-pip py-numpy
.PHONY: py

# Note -- this runs a target in the cpython package, which can only be run
# after python-wasm is also built.
py-pip: cpython python-wasm
	cd packages/cpython && make pip

py-cython: packages/py-cython/${BUILT}
packages/py-cython/${BUILT}: zig python-wasm
	cd packages/py-cython && make all
.PHONY: py-cython
test-py-cython: py-cython
	cd packages/py-cython && make test

py-mpmath: packages/py-mpmath/${BUILT}
packages/py-mpmath/${BUILT}: zig python-wasm
	cd packages/py-mpmath && make all
.PHONY: py-mpmath
test-py-mpmath: py-mpmath
	cd packages/py-mpmath && make test

py-sympy: packages/py-sympy/${BUILT}
packages/py-sympy/${BUILT}: zig python-wasm py-mpmath
	cd packages/py-sympy && make all
.PHONY: py-sympy
test-py-sympy: py-sympy
	cd packages/py-sympy && make test

py-numpy: packages/py-numpy/${BUILT}
packages/py-numpy/${BUILT}: zig python-wasm py-cython py-pip
	cd packages/py-numpy && make all
.PHONY: py-numpy
test-py-numpy: py-numpy
	cd packages/py-numpy && make test

.PHONY: clean
clean:
	./bin/make-all clean ${PACKAGE_DIRS}

clean-build:
	./bin/make-all clean-build ${PACKAGE_DIRS}

test: test-unused test-cpython test-bench test-dylink test-posix-node test-python-wasm test-py-mpmath test-py-cython test-f2c test-py-numpy 
.PHONY: test

test-bench: python-wasm
	cd packages/bench && make test

# test building packages that aren't actually used yet, just to make sure they build
test-unused: ncurses vis dash
.PHONEY: test-unused

# Run tests suites of Python libraries that we support.  These can be VERY long, which is why
# we can't just run them as part of "make test" above.  And they probably don't work at all yet.
test-py-full: test-py-sympy
.PHONY: test
