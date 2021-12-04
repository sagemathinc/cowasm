# Download and install a specific tested version of zig
# for your architecture here, so that we can use it for
# building everything else.

# TODO: support MacOS. Right now
#  uname -s --> Linux and Darwin
# but need      linux and macos

# Find the latest version at https://ziglang.org/download/

VERSION = 0.9.0-dev.1815+20e19e75f
ARCH = $(shell uname -m)

dist/${VERSION}:
	rm -rf dist
	mkdir -p dist build
	curl https://ziglang.org/builds/zig-linux-${ARCH}-${VERSION}.tar.xz > build/zig.tar.xz
	tar xf build/zig.tar.xz -C dist --strip-components=1
	rm build/zig.tar.xz
	touch dist/${VERSION}
