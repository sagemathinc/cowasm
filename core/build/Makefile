
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
BIN = ${CWD}/../../bin
SRC = ${CWD}/src
ZIG_BOOTSTRAP_FILES = $(shell find ${SRC}/zig -type f 2>/dev/null)
WASI_SDK_BOOTSTRAP_FILES = $(shell find ${SRC}/wasi-sdk -type f 2>/dev/null)

all: ${BIN}/zig

${BUILD}/.build: ${TARBALL} ${ZIG_BOOTSTRAP_FILES}
	rm -rf ${BUILD}
	cp -rv src ${BUILD}
	touch ${BUILD}/.build

${BIN}/zig: ${BUILD}/.build
	cd ${BUILD}/zig && make
	touch ${BIN}/zig

.PHONY: zig
zig: ${BIN}/zig

${BUILD}/wasi-sdk/Makefile: ${BUILD}/.build ${WASI_SDK_BOOTSTRAP_FILES}
	rm -rf ${BUILD}/wasi-sdk.tmp
	cp -a ${SRC}/wasi-sdk ${BUILD}/wasi-sdk.tmp
	rm -rf ${BUILD}/wasi-sdk
	mv ${BUILD}/wasi-sdk.tmp ${BUILD}/wasi-sdk
	touch ${BUILD}/wasi-sdk/Makefile

.PHONY: wasi-sdk-next
wasi-sdk-next:
	@set -e; \
	lock_dir="${CWD}/.wasi-sdk.lock"; \
	while ! mkdir "$${lock_dir}" 2>/dev/null; do sleep 1; done; \
	trap 'rmdir "$${lock_dir}"' EXIT INT TERM; \
	$(MAKE) ${BUILD}/wasi-sdk/Makefile; \
	cd ${BUILD}/wasi-sdk && $(MAKE)

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next:
	@set -e; \
	lock_dir="${CWD}/.wasi-sdk.lock"; \
	while ! mkdir "$${lock_dir}" 2>/dev/null; do sleep 1; done; \
	trap 'rmdir "$${lock_dir}"' EXIT INT TERM; \
	$(MAKE) ${BUILD}/wasi-sdk/Makefile; \
	cd ${BUILD}/wasi-sdk && $(MAKE) test

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
	if ! PATH="/usr/bin:/bin" COWASM_TOOLCHAIN= ${BIN}/cowasm-cc --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep '^wasm32-wasi$$' "$$tmp"; \
	rm -f "$$tmp"
	tmp="$$(mktemp)"; \
	if ! PATH="${BIN}:$$PATH" COWASM_TOOLCHAIN=clang ${BIN}/cowasm-cc --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep '^wasm32-wasi$$' "$$tmp"; \
	rm -f "$$tmp"
	PATH="${BIN}:$$PATH" ${SRC}/test/clang-backend-smoke.sh ${BIN}/cowasm-cc
	PATH="${BIN}:$$PATH" ${SRC}/test/archive-wrapper-smoke.sh ${BIN}/cowasm-ar ${BIN}/cowasm-ranlib
	tmp="$$(mktemp)"; \
	if ! PATH="/usr/bin:/bin" COWASM_TOOLCHAIN= ${BIN}/zcc --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep '^wasm32-wasi$$' "$$tmp"; \
	rm -f "$$tmp"
	tmp="$$(mktemp)"; \
	if ! PATH="/usr/bin:/bin" COWASM_TOOLCHAIN= ${BIN}/z++ --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep '^wasm32-wasi$$' "$$tmp"; \
	rm -f "$$tmp"
	tmp="$$(mktemp)"; \
	if PATH="${BIN}:$$PATH" COWASM_TOOLCHAIN=clang ${BIN}/zcc --print-multiarch >"$$tmp" 2>&1; then \
		cat "$$tmp"; \
		rm -f "$$tmp"; \
		exit 1; \
	fi; \
	grep "only 'zig' is implemented" "$$tmp"; \
	rm -f "$$tmp"

clean:
	rm -rf build .wasi-sdk.lock
