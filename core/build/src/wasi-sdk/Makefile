# Download and install a pinned wasi-sdk toolchain side-by-side with the
# current Zig 0.10.1 baseline. This target intentionally does not replace
# bin/zig or the default CoWasm compiler path.

include ../Makefile-vars-build

VERSION = 33.0
RELEASE = wasi-sdk-33

# wasi-sdk release assets use arm64 instead of aarch64.
ARCH = $(shell uname -m | sed s/aarch64/arm64/)

# wasi-sdk release assets use macos instead of Darwin.
OS = $(shell uname -s | sed s/Darwin/macos/ | sed s/Linux/linux/)

ASSET = wasi-sdk-${VERSION}-${ARCH}-${OS}.tar.gz
URL = https://github.com/WebAssembly/wasi-sdk/releases/download/${RELEASE}/${ASSET}
TARBALL = ${UPSTREAM}/${ASSET}
DIST_WASI_SDK_NATIVE = ${DIST}/wasi-sdk-next/native

ifeq (${ARCH}-${OS},x86_64-linux)
TARBALL_SHA256 = 0ba8b5bfaeb2adf3f29bab5841d76cf5318ab8e1642ea195f88baba1abd47bce
endif

ifeq (${ARCH}-${OS},arm64-linux)
TARBALL_SHA256 = 4f98ee738c7abb45c81a94d1461fc53cc569d1cd01498951c8184d841a027844
endif

ifeq (${ARCH}-${OS},x86_64-macos)
TARBALL_SHA256 = 18f3f201ba9734e6a4455b0b6410690395a55e9ffa9f6f5066f66083a94b93b3
endif

ifeq (${ARCH}-${OS},arm64-macos)
TARBALL_SHA256 = 85c997a2665ead91673b5bb88b7d0df3fc8900df3bfa244f720d478187bbdc78
endif

WASI_SDK_CLANG = ${DIST_WASI_SDK_NATIVE}/bin/clang
WASI_SDK_CLANGXX = ${DIST_WASI_SDK_NATIVE}/bin/clang++
WASI_SDK_WASM_LD = ${DIST_WASI_SDK_NATIVE}/bin/wasm-ld
WASI_SDK_LLVM_AR = ${DIST_WASI_SDK_NATIVE}/bin/llvm-ar
WASI_SDK_LLVM_RANLIB = ${DIST_WASI_SDK_NATIVE}/bin/llvm-ranlib
WASI_SDK_LLVM_NM = ${DIST_WASI_SDK_NATIVE}/bin/llvm-nm
WASI_SDK_LLVM_OBJDUMP = ${DIST_WASI_SDK_NATIVE}/bin/llvm-objdump
WASI_SDK_LLVM_STRIP = ${DIST_WASI_SDK_NATIVE}/bin/llvm-strip
WASI_SDK_LLVM_STRINGS = ${DIST_WASI_SDK_NATIVE}/bin/llvm-strings

all: \
	${BIN}/wasi-sdk-clang-next \
	${BIN}/wasi-sdk-clang++-next \
	${BIN}/wasi-sdk-wasm-ld-next \
	${BIN}/wasi-sdk-llvm-ar-next \
	${BIN}/wasi-sdk-llvm-ranlib-next \
	${BIN}/wasi-sdk-llvm-nm-next \
	${BIN}/wasi-sdk-llvm-objdump-next \
	${BIN}/wasi-sdk-llvm-strip-next \
	${BIN}/wasi-sdk-llvm-strings-next

define verify_tarball_sha256
	@if [ -n "${TARBALL_SHA256}" ]; then \
		if command -v sha256sum >/dev/null; then \
			echo "${TARBALL_SHA256}  ${TARBALL}" | sha256sum -c -; \
		else \
			echo "${TARBALL_SHA256}  ${TARBALL}" | shasum -a 256 -c -; \
		fi || { rm -f ${TARBALL}; exit 1; }; \
	fi
endef

${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${URL} -o ${TARBALL}
	$(verify_tarball_sha256)

.PHONY: fetch-source
fetch-source: ${TARBALL}
	$(verify_tarball_sha256)

${DIST_WASI_SDK_NATIVE}/.${VERSION}: ${TARBALL}
	$(verify_tarball_sha256)
	rm -rf ${DIST_WASI_SDK_NATIVE}
	mkdir -p ${DIST_WASI_SDK_NATIVE}
	tar xf ${TARBALL} -C ${DIST_WASI_SDK_NATIVE} --strip-components=1
	touch ${DIST_WASI_SDK_NATIVE}/.${VERSION}

${BIN}/wasi-sdk-clang-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_CLANG} $@

${BIN}/wasi-sdk-clang++-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_CLANGXX} $@

${BIN}/wasi-sdk-wasm-ld-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_WASM_LD} $@

${BIN}/wasi-sdk-llvm-ar-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_AR} $@

${BIN}/wasi-sdk-llvm-ranlib-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_RANLIB} $@

${BIN}/wasi-sdk-llvm-nm-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_NM} $@

${BIN}/wasi-sdk-llvm-objdump-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_OBJDUMP} $@

${BIN}/wasi-sdk-llvm-strip-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_STRIP} $@

${BIN}/wasi-sdk-llvm-strings-next: ${DIST_WASI_SDK_NATIVE}/.${VERSION}
	ln -sf ${WASI_SDK_LLVM_STRINGS} $@

.PHONY: test
test: all
	bash ${CWD}/test-wasi-sdk-next.sh \
		${WASI_SDK_CLANG} \
		${WASI_SDK_CLANGXX} \
		${WASI_SDK_WASM_LD} \
		${WASI_SDK_LLVM_OBJDUMP} \
		${WASI_SDK_LLVM_NM} \
		${WASI_SDK_LLVM_STRINGS} \
		${BIN}

.PHONY: clean
clean:
	rm -rf ${DIST_WASI_SDK_NATIVE}
	rm -f \
		${BIN}/wasi-sdk-clang-next \
		${BIN}/wasi-sdk-clang++-next \
		${BIN}/wasi-sdk-wasm-ld-next \
		${BIN}/wasi-sdk-llvm-ar-next \
		${BIN}/wasi-sdk-llvm-ranlib-next \
		${BIN}/wasi-sdk-llvm-nm-next \
		${BIN}/wasi-sdk-llvm-objdump-next \
		${BIN}/wasi-sdk-llvm-strip-next \
		${BIN}/wasi-sdk-llvm-strings-next
