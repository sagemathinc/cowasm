# Download and install a specific tested version of zig
# for your architecture here, so that we can use it for
# building everything else.

include ../build/Makefile-vars

# Find the latest version at https://ziglang.org/download/
# This is for pre-release

VERSION = 0.10.0-dev.3880+e2bb92b2e

# WARNING: when 0.10.0-dev.3659 appeared, they massively broke
# everything with a huge merge as explained here:
#   https://github.com/ziglang/zig/wiki/Self-Hosted-Compiler-Upgrade-Guide
# Absolutely everything I've attempted to compile has nearly immediately
# segfaulted with this version, even with the -fstage1 flag. Wow.
# Hopefully it will stabilize after a while. This of course means, we
# can't possibly upgrade our use of zig for a while.
#
# REPORTED UPSTREAM at https://github.com/ziglang/zig/issues/12582
#
## VERSION = 0.10.0-dev.3659+e5e6eb983


# Using sed because uname -s --> x86_64 or arm64, but need aarch64
ARCH = $(shell uname -m | sed s/arm64/aarch64/)

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and macos
OS = $(shell uname -s  | sed s/Darwin/macos/ | sed s/Linux/linux/)

# Example  https://ziglang.org/builds/zig-macos-aarch64-0.10.0-dev.3315+1a16b7214.tar.xz

TARBALL = ${UPSTREAM}/zig-${OS}-${ARCH}-${VERSION}.tar.xz
URL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

# This is for stable releases
#VERSION = 0.9.1
#TARBALL = https://ziglang.org/download/${VERSION}/zig-${OS}-${ARCH}-${VERSION}.tar.xz
# for dev versions:
#VERSION = 0.10.0-dev.2751+08459ff1c
#TARBALL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

all: ${DIST_NATIVE}/.${VERSION} ${BIN}/zig-fPIC ${BIN}/zig

include ../build/Makefile-rules

${DIST_NATIVE}/.${VERSION}: ${TARBALL}
	rm -rf ${DIST_NATIVE}
	mkdir -p ${DIST_NATIVE}
	tar xf ${TARBALL} -C ${DIST_NATIVE} --strip-components=1
	touch ${DIST_NATIVE}/.${VERSION}

${BIN}/zig: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${DIST_NATIVE}/zig ${BIN}/zig

${BIN}/zig-fPIC: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${CWD}/bin/zig-fPIC ${BIN}/zig-fPIC

