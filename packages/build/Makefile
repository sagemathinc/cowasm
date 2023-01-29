
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
BIN = ${CWD}/../../bin
SRC = ${CWD}/src

all: ${BIN}/zig ${BIN}/cowasm-package-path

${BUILD}/.build: ${TARBALL}
	rm -rf ${BUILD}
	cp -rv src ${BUILD}
	touch ${BUILD}/.build

${BIN}/zig: ${BUILD}/.build ${BIN}/cowasm-package-path
	cd ${BUILD}/zig && make
	touch ${BIN}/zig

.PHONEY: zig
zig: ${BIN}/zig

${BIN}/cowasm-package-path: ${SRC}/cowasm-package-path
	ln -s ${SRC}/cowasm-package-path ${BIN}/cowasm-package-path
	touch ${BIN}/cowasm-package-path

test: all
	echo "It installed."

clean:
	rm -rf build