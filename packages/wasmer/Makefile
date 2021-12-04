# Download and build wasmer from source using Rust.
# We have to do this since, e.g., there's no wasmer binary for linux-aarch64,
# i.e., Docker on a macbook, and that is a required platform to support.

# See https://github.com/wasmerio/wasmer/tags
VERSION = 2.1.0

export PATH := ${HOME}/.cargo/bin:$(PATH)

export RUSTUP_HOME := /tmp/rustup

all: dist/${VERSION}

dist/${VERSION}:
	rm -rf dist build
	mkdir -p build
	curl https://sh.rustup.rs -sSf > build/install.sh
	cd build && sh ./install.sh -y
	cd build && git clone --depth 1 --branch ${VERSION} https://github.com/wasmerio/wasmer.git
	cd build/wasmer && make build-wasmer
	mkdir -p dist
	cp build/wasmer/target/release/wasmer dist/
	rm -rf build
	rm -rf ${RUSTUP_HOME}
	touch dist/${VERSION}

clean:
	rm -rf dist build
