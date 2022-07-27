# Download and install a specific tested version of zig
# for your architecture here, so that we can use it for
# building everything else.

# Find the latest version at https://ziglang.org/download/

# Example  https://ziglang.org/builds/zig-macos-aarch64-0.10.0-dev.3315+1a16b7214.tar.xz

# This is for pre-release
VERSION = 0.10.0-dev.3315+1a16b7214
TARBALL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

# This is for stable releases
#VERSION = 0.9.1
#TARBALL = https://ziglang.org/download/${VERSION}/zig-${OS}-${ARCH}-${VERSION}.tar.xz

# for dev versions:
#VERSION = 0.10.0-dev.2751+08459ff1c
#TARBALL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

# Using sed because uname -s --> x86_64 or arm64, but need aarch64
ARCH = $(shell uname -m | sed s/arm64/aarch64/)

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and macos
OS = $(shell uname -s  | sed s/Darwin/macos/ | sed s/Linux/linux/)


dist/${VERSION}:
	rm -rf dist
	mkdir -p dist build
	curl ${TARBALL} > build/zig.tar.xz
	tar xf build/zig.tar.xz -C dist --strip-components=1
	rm build/zig.tar.xz
	touch dist/${VERSION}

clean:
	rm -rf build dist