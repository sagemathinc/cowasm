
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

.PHONY: zig
zig: ${BIN}/zig

.PHONY: test
test: all
	echo "It installed."
	tmp="$$(mktemp)"; \
	if ! PATH="${BIN}:$$PATH" COWASM_TOOLCHAIN= ${BIN}/cowasm-cc -cowasm-verbose --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep 'COWASM_TOOLCHAIN=zig' "$$tmp"; \
	grep '^wasm32-wasi$$' "$$tmp"; \
	rm -f "$$tmp"
	tmp="$$(mktemp)"; \
	if PATH="${BIN}:$$PATH" COWASM_TOOLCHAIN=clang ${BIN}/cowasm-cc --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep "only 'zig' is implemented" "$$tmp"; \
	rm -f "$$tmp"

clean:
	rm -rf build
