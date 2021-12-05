# See https://github.com/wasmerio/wasmer/tags
VERSION = 2.1.0

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

all: dist/${VERSION}

dist/${VERSION}:
	make binary || make source

# Attempt to grab a binary and install it into dist.
export WASMER_DIR := ${CWD}/dist
.PHONEY: binary
binary:
	curl https://get.wasmer.io -sSfL | sh -s ${VERSION}
	touch dist/${VERSION}

export RUSTUP_HOME := /tmp/rustup
export PATH := ${HOME}/.cargo/bin:$(PATH)

# Fallback if no binary available: download and build wasmer from source using Rust.
# We have to do this since, e.g., there's no wasmer binary for linux-aarch64,
# i.e., Docker on a macbook, and that is a required platform to support.

# Another weird thing is that when we build wasmer from source it's about
# 23MB, but the binary they distribute for Linux is 119MB; maybe it is
# a "very fat binary".

.PHONEY: source
source:
	rm -rf dist build
	mkdir -p build
	curl https://sh.rustup.rs -sSf > build/install.sh
	cd build && sh ./install.sh -y
	cd build && git clone --depth 1 --branch ${VERSION} https://github.com/wasmerio/wasmer.git
	cd build/wasmer && make build-wasmer
	mkdir -p dist/bin
	cp build/wasmer/target/release/wasmer dist/bin/
	rm -rf build
	rm -rf ${RUSTUP_HOME}
	touch dist/${VERSION}

clean:
	rm -rf dist build
