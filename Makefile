# Do not doing any "make -j4" for any makes in here, since they trigger
# caching bugs in zig. You can try with newer versions of zig, of course.

BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

PACKAGE_DIRS = $(dir $(shell ls packages/*/Makefile))

all: python-wasm py f2c coreutils man viz dash terminal browser website dash-wasm

cpython: packages/cpython/${BUILT}
packages/cpython/${BUILT}: posix-wasm zlib lzma libedit zig wasi-js sqlite bzip2 # openssl
	cd packages/cpython && make all
.PHONY: cpython

coreutils: packages/coreutils/${BUILT}
packages/coreutils/${BUILT}: zig posix-wasm
	cd packages/coreutils && make -j8
.PHONY: coreutils

dash: packages/dash/${BUILT}
packages/dash/${BUILT}: zig libedit
	cd packages/dash && make all
.PHONY: dash

dash-wasm: packages/dash-wasm/${BUILT}
packages/dash-wasm/${BUILT}: dash kernel coreutils bzip2 lua viz man sqlite libarchive
	cd packages/dash-wasm && make all
.PHONY: dash-wasm

docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/cowasm master | awk '{print $$1}'` -t cowasm .
.PHONY: docker

docker-nocache:
	docker build --no-cache -t cowasm .
.PHONY: docker-nocache

# NOTE: there is a partial circular dep between dylink and cpython right now, so cpython actually
# builds dylink halfway through its build.  We will refactor to fix that.  The code involving cpython
# in dylink should actually just be in the cpython package, I think.
dylink: packages/dylink/${BUILT}
packages/dylink/${BUILT}: node zig posix-wasm lzma cpython
	cd packages/dylink && make all
.PHONY: dylink

kernel: packages/kernel/${BUILT}
packages/kernel/${BUILT}: node wasi-js zig posix-wasm dylink posix-node wasm-opt
	cd packages/kernel && make all
.PHONY: kernel

libarchive: packages/libarchive/${BUILT}
packages/libarchive/${BUILT}: zig termcap
	cd packages/libarchive && make all
.PHONY: libarchive

libedit: packages/libedit/${BUILT}
packages/libedit/${BUILT}: zig termcap
	cd packages/libedit && make all
.PHONY: libedit

lua: packages/lua/${BUILT}
packages/lua/${BUILT}: zig libedit termcap
	cd packages/lua && make all
.PHONY: lua

lzma: packages/lzma/${BUILT}
packages/lzma/${BUILT}: zig posix-wasm
	cd packages/lzma && make all
.PHONY: lzma

man: packages/man/${BUILT}
packages/man/${BUILT}: zig posix-wasm
	cd packages/man && make -j8
.PHONY: man

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
packages/posix-node/${BUILT}: zig node
	cd packages/posix-node && make all
.PHONY: posix-node

posix-wasm: packages/posix-wasm/${BUILT}
packages/posix-wasm/${BUILT}: zig
	cd packages/posix-wasm && make all
.PHONY: posix-wasm

python-wasm: packages/python-wasm/${BUILT}
packages/python-wasm/${BUILT}: kernel node zig py
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
packages/terminal/${BUILT}: node  python-wasm
	cd packages/terminal && make all
.PHONY: terminal

viz: packages/viz/${BUILT}
packages/viz/${BUILT}: termcap ncurses zig lua
	cd packages/viz && make all
.PHONY: viz

wasi-js: packages/wasi-js/${BUILT}
packages/wasi-js/${BUILT}: node
	cd packages/wasi-js && make all
.PHONY: wasi-js

browser: packages/browser/${BUILT}
packages/browser/${BUILT}: node python-wasm
	cd packages/browser && make all
.PHONY: browser

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
packages/libgit2/${BUILT}: zig kernel
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

py: py-cython py-mpmath py-sympy py-pip py-numpy
.PHONY: py

# Note -- this runs a target in the cpython package, which can only be run
# after kernel is also built.
py-pip: cpython kernel
	cd packages/cpython && make pip

py-cython: packages/py-cython/${BUILT}
packages/py-cython/${BUILT}: zig kernel
	cd packages/py-cython && make all
.PHONY: py-cython

py-mpmath: packages/py-mpmath/${BUILT}
packages/py-mpmath/${BUILT}: zig kernel
	cd packages/py-mpmath && make all
.PHONY: py-mpmath

py-sympy: packages/py-sympy/${BUILT}
packages/py-sympy/${BUILT}: zig kernel py-mpmath
	cd packages/py-sympy && make all
.PHONY: py-sympy

py-numpy: packages/py-numpy/${BUILT}
packages/py-numpy/${BUILT}: zig kernel py-cython py-pip
	cd packages/py-numpy && make all
.PHONY: py-numpy

bin-wasm:
	rm -rf ${CWD}/bin-wasm
	mkdir -p ${CWD}/bin-wasm
	cp -v packages/*/dist/wasm/bin/* ${CWD}/bin-wasm
.PHONY: bin-wasm

.PHONY: clean
clean:
	./bin/make-all clean ${PACKAGE_DIRS}
	rm -rf ${CWD}/bin-wasm

clean-build:
	./bin/make-all clean-build ${PACKAGE_DIRS}

.PHONY: test
test:
	./bin/make-all test ${PACKAGE_DIRS}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- FULL COWASM TEST SUITE PASSED!    #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

