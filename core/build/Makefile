
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
BIN = ${CWD}/../../bin
SRC = ${CWD}/src

all: ${BIN}/zig

${BUILD}/.build: ${TARBALL}
	rm -rf ${BUILD}
	cp -rv src ${BUILD}
	touch ${BUILD}/.build

${BIN}/zig: ${BUILD}/.build
	cd ${BUILD}/zig && make
	touch ${BIN}/zig

.PHONEY: zig
zig: ${BIN}/zig

test: all
	echo "It installed."

clean:
	rm -rf build