
VERSION = 1.2.2

URL = https://github.com/sagemathinc/cowasm-build/archive/refs/tags/${VERSION}.tar.gz


CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
UPSTREAM = ${CWD}/../../upstream/sources
BUILD = ${CWD}/build
BIN = ${CWD}/../../bin
TARBALL = ${UPSTREAM}/build-${VERSION}.tar.gz

all: ${BIN}/node ${BIN}/zig

${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${URL} -o ${TARBALL}

${BUILD}/.build: ${TARBALL}
	rm -rf ${BUILD}
	mkdir -p ${BUILD}
	tar xf ${TARBALL} -C ${BUILD} --strip-components=1
	touch ${BUILD}/.build

${BIN}/node: ${BUILD}/.build
	cd ${BUILD}/node && make

.PHONEY: node
node: ${BIN}/node ${BIN}/npx ${BIN}/npm ${BIN}/cowasm-package-path

${BIN}/zig: ${BUILD}/.build
	cd ${BUILD}/zig && make
	touch ${BIN}/zig

.PHONEY: zig
zig: ${BIN}/zig

test: all
	echo "It installed."

clean:
	rm -rf build