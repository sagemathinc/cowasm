# Download and install a specific tested version of zig
# for your architecture here, so that we can use it for
# building everything else.

include ../build/Makefile-vars

# Find the latest version at https://ziglang.org/download/

# Using sed because uname -s --> x86_64 or arm64, but need aarch64
ARCH = $(shell uname -m | sed s/arm64/aarch64/)

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and macos
OS = $(shell uname -s  | sed s/Darwin/macos/ | sed s/Linux/linux/)

# Example  https://ziglang.org/builds/zig-macos-aarch64-0.10.0-dev.3315+1a16b7214.tar.xz
# Example  https://ziglang.org/download/0.10.0/zig-linux-aarch64-0.10.0.tar.xz
# https://ziglang.org/download/0.10.0/zig-macos-aarch64-0.10.0.tar.xz

# This is for stable releases

#VERSION = 0.10.0
#URL = https://ziglang.org/download/${VERSION}/zig-${OS}-${ARCH}-${VERSION}.tar.xz


# UGH -- suddenly there are no more binaries of master for at least one
# of my supported platforms.  I complained here: https://ziggit.dev/t/zig-binaries/454
# I am definitely not looking forward to having to build zig from source
# for all my supported platforms, but that might be unavoidable.
# I guess we are stuck with b40fc7018 for a while :-(.
# I also added a comment here: https://github.com/ziglang/zig/issues/13303#issuecomment-1309181780

# for dev versions:
VERSION = 0.11.0-dev.38+b40fc7018
URL = https://ziglang.org/builds/zig-${OS}-${ARCH}-${VERSION}.tar.xz

TARBALL = ${UPSTREAM}/zig-${OS}-${ARCH}-${VERSION}.tar.xz



all: ${DIST_NATIVE}/.${VERSION} ${BIN}/cowasm-cc ${BIN}/cowasm-c++ ${BIN}/cowasm-zig ${BIN}/zig

include ../build/Makefile-rules

${DIST_NATIVE}/.${VERSION}: ${TARBALL}
	rm -rf ${DIST_NATIVE}
	mkdir -p ${DIST_NATIVE}
	tar xf ${TARBALL} -C ${DIST_NATIVE} --strip-components=1
	# 01-emscripten.patch -- Add support for -target wasm32-emscripten
	# Note the funny || is because the zig binaries are laid out in
	# inconstent way.
	cd ${DIST_NATIVE}/lib/zig 2>/dev/null || cd ${DIST_NATIVE}/lib \
		&& cat ${SRC}/patches/01-emscripten.patch | patch -p3
	touch ${DIST_NATIVE}/.${VERSION}

${BIN}/zig: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${DIST_NATIVE}/zig ${BIN}/zig
	touch ${BIN}/zig

${BIN}/cowasm-cc: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${CWD}/bin/zig_cowasm_compiler.py ${BIN}/cowasm-cc
	touch ${BIN}/cowasm-cc

${BIN}/cowasm-c++: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${CWD}/bin/zig_cowasm_compiler.py ${BIN}/cowasm-c++
	touch ${BIN}/cowasm-c++

${BIN}/cowasm-zig: ${DIST_NATIVE}/.${VERSION}
	ln -sf ${CWD}/bin/zig_cowasm_compiler.py ${BIN}/cowasm-zig
	touch ${BIN}/cowasm-zig

test: ${DIST_NATIVE}/.${VERSION}
	# Test that the correct version is installed. That's something at least.
	${BIN}/zig version | grep ${VERSION}
