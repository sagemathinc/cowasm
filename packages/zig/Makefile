# Download and install a specific tested version of zig
# for your architecture here, so that we can use it for
# building everything else.

# Find the latest version at https://ziglang.org/download/

VERSION = 0.9.0

# Using sed because uname -s --> x86_64 or arm64, but need aarch64
ARCH = $(shell uname -m | sed s/arm64/aarch64/)

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and macos
OS = $(shell uname -s  | sed s/Darwin/macos/ | sed s/Linux/linux/)

TARBALL = https://ziglang.org/download/${VERSION}/zig-${OS}-${ARCH}-${VERSION}.tar.xz
# for dev versions:
#TARBALL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

dist/${VERSION}:
	rm -rf dist
	mkdir -p dist build
	curl ${TARBALL} > build/zig.tar.xz
	tar xf build/zig.tar.xz -C dist --strip-components=1
	rm build/zig.tar.xz
	touch dist/${VERSION}

clean:
	rm -rf build dist