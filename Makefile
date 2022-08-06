BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

all: python-wasm webpack terminal website

packages/python-wasm/${BUILT}: cpython wasi zig posix-wasm dylink
	cd packages/python-wasm && make all
.PHONY: python-wasm
python-wasm: packages/python-wasm/${BUILT}

.PHONY: zig
zig:
	cd packages/zig && make

packages/posix-wasm/${BUILT}: zig
	cd packages/posix-wasm && make all
.PHONY: posix-wasm
posix-wasm: packages/posix-wasm/${BUILT}

packages/openssl/${BUILT}: zig
	cd packages/openssl && make all
.PHONY: openssl
openssl: packages/openssl/${BUILT}



packages/dylink/${BUILT}: zig posix-wasm cpython
	cd packages/dylink && make all
.PHONY: dylink
dylink: packages/dylink/${BUILT}


packages/lzma/${BUILT}: zig posix-wasm
	cd packages/lzma && make all
.PHONY: lzma
lzma: packages/lzma/${BUILT}


packages/zlib/${BUILT}: zig
	cd packages/zlib && make all
.PHONY: zlib
zlib: packages/zlib/${BUILT}


packages/termcap/${BUILT}: zig
	cd packages/termcap && make all
.PHONY: termcap
termcap: packages/termcap/${BUILT}


packages/libedit/${BUILT}: zig termcap
	cd packages/libedit && make all
.PHONY: libedit
libedit: packages/libedit/${BUILT}


packages/cpython/${BUILT}: posix-wasm zlib lzma libedit zig wasi sqlite
	cd packages/cpython && make all
.PHONY: cpython
cpython: packages/cpython/${BUILT}


packages/wasi/${BUILT}:
	cd packages/wasi && make all
.PHONY: wasi
wasi: packages/wasi/${BUILT}


packages/webpack/${BUILT}: python-wasm
	cd packages/webpack && make all
.PHONY: webpack
webpack: packages/webpack/${BUILT}


packages/terminal/${BUILT}: python-wasm
	cd packages/terminal && make all
.PHONY: terminal
terminal: packages/terminal/${BUILT}


# this builds and you can make ncurses a dep for cpython and change src/Setup.local to get
# the _ncurses module to build. But there are still issues to solve (probably straightforward, but tedious)
# as mentioned in the cpython/src/Setup.local.
packages/ncurses/${BUILT}: termcap posix-wasm zig
	cd packages/ncurses && make all
.PHONY: ncurses
ncurses: packages/ncurses/${BUILT}


packages/sqlite/${BUILT}: libedit posix-wasm zig zlib
	cd packages/sqlite && make all
.PHONY: sqlite
sqlite: packages/sqlite/${BUILT}


packages/website/${BUILT}: python-wasm
	cd packages/website && make all
.PHONY: website
website: packages/website/${BUILT}

.PHONY: docker
docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/python-wasm master | awk '{print $$1}'` -t python-wasm .

.PHONY: docker-nocache
docker-nocache:
	docker build --no-cache -t python-wasm .

clean:
	cd packages/bench && make clean
	cd packages/cpython && make clean
	cd packages/dylink && make clean
	cd packages/libedit && make clean
	cd packages/lzma && make clean
	cd packages/ncurses && make clean
	cd packages/openssl && make clean
	cd packages/posix-wasm && make clean
	cd packages/python-wasm && make clean
	cd packages/sqlite && make clean
	cd packages/termcap && make clean
	cd packages/terminal && make clean
	cd packages/wasi && make clean
	cd packages/webpack && make clean
	cd packages/website && make clean
	cd packages/zig && make clean
	cd packages/zlib && make clean

test: python-wasm
	cd packages/bench && make test
	cd packages/dylink && make test
	cd packages/python-wasm && make test
