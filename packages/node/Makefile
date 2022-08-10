# Download and install a specific tested version of node
# for your architecture here, so that we can use it for
# building everything else.

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))


# Find the latest version at https://nodejs.org/dist/latest/:
VERSION = 18.7.0

# Using sed because uname -s --> x86_64 or arm64, but need x64 or arm64
ARCH = $(shell uname -m | sed s/x86_64/x64/)

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and darwin
OS = $(shell uname -s  | sed s/Darwin/darwin/ | sed s/Linux/linux/)

TARBALL = https://nodejs.org/dist/v${VERSION}/node-v${VERSION}-${OS}-${ARCH}.tar.xz

all: dist/${VERSION} ../../bin/node ../../bin/npm ../../bin/npx

dist/${VERSION}:
	rm -rf dist
	mkdir -p dist build
	curl ${TARBALL} > build/node.tar.xz
	tar xf build/node.tar.xz -C dist --strip-components=1
	rm build/node.tar.xz
	touch dist/${VERSION}

../../bin/node:
	ln -sf ${CWD}/dist/bin/node ${CWD}/../../bin/node

../../bin/npm:
	ln -sf ${CWD}/dist/bin/npm ${CWD}/../../bin/npm

../../bin/npx:
	ln -sf ${CWD}/dist/bin/npx ${CWD}/../../bin/npx


clean:
	rm -rf build dist