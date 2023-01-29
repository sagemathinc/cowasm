
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
BIN = ${CWD}/../../bin

all: ${BIN}/node ${BIN}/zig

${BUILD}/.build: ${TARBALL}
	rm -rf ${BUILD}
	cp -rv src ${BUILD}
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