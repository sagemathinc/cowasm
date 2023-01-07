include ../build/Makefile-vars

# OPT     = -O ReleaseFast
# OPT     = -O ReleaseSafe
OPT     = -O ReleaseSmall
# OPT     = -O Debug
ZIG_PKG = --main-pkg-path ${SRC}

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
DYLINK_WASM = $(shell cowasm-package-path dylink)/wasm

WASI_EMULATED = -lwasi-emulated-mman -lwasi-emulated-process-clocks -lwasi-emulated-signal
WASM_CFLAGS   = -D_WASI_EMULATED_SIGNAL  -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_PROCESS_CLOCKS -dynamic ${OPT}

all: node_modules ${DIST}/.built kernel ${DIST}/termcap

include ../build/Makefile-rules

${DIST}/termcap: ${SRC}/termcap
	mkdir -p ${DIST}
	cp $< $@

${DIST}/.built: node_modules
	npx tsc
	touch ${DIST}/.built

.PHONY: test
test: all test-misc test-posix
	# no jest tests yet
	#pnpm run test

strip: node_modules
	pnpm run strip


###
# The CoWasm Kernel
###

KERNEL_WASM_SOURCES = \
	${POSIX_SOURCES} \
	src/kernel/interface.zig \
	src/kernel/cowasm.zig \
	$(shell find src/wasm/posix/*.zig -type f)

# TODO: I think libedit and libtermcap should probably be dynamic
# libraries that get loaded when needed.

${DIST}/kernel/kernel.wasm: node_modules ${KERNEL_WASM_SOURCES} ${CWD}/src/wasm/posix/stdlib.c
	cd ../build && make zig
	cd src && zig build-lib \
	   ${WASM_CFLAGS} \
	   ${ZIG_PKG} \
		-rdynamic \
		-target wasm32-wasi \
		--import-memory \
		--import-table \
		-L${DYLINK_WASM}/ -ldylink -lc -lm ${WASI_EMULATED} \
		-I. -I${POSIX_WASM} \
		${POSIX_WASM}/libposix.a ${CWD}/src/wasm/posix/stdlib.c \
		kernel/interface.zig
	mkdir -p ${DIST}/cowasm
	rm -f src/interface.wasm.o
	mv src/interface.wasm ${DIST}/kernel/kernel.wasm

.PHONY: kernel
kernel: ${DIST}/kernel/kernel.wasm

# Using wasm-opt when I put this in shrinks:
#  - the non-zip size of the wasm by 10%.   (715kb to 645kb)
#  - the zip'd size by 3%.                  (339kb to 329kb)
# Note that this could change if kernel.wasm, llvm, zig, etc., changes over
# time, of course.
.PHONY: opt
opt: ${DIST}/kernel/kernel.wasm
	${BIN}/cowasm-opt ${DIST}


###
# Testing
###

# There isn't much using zig testing yet, but should be.

TEST = POSIX_WASM="$(shell cowasm-package-path @cowasm/posix-wasm)" CPYTHON_WASM="$(shell cowasm-package-path @cowasm/cpython)" ./test-zig.sh

test-posix:
	cd src && \
		${TEST} wasm/posix/unistd.zig   ${OPT} && \
		${TEST} wasm/posix/stdio.zig   ${OPT} && \
		${TEST} wasm/posix/string.zig   ${OPT} && \
		${TEST} wasm/posix/stdlib.zig wasm/posix/stdlib.c  ${OPT}


${BUILD}/test/hello.wasm: ${SRC}/test/hello.c
	mkdir -p ${BUILD}/test/
	${BIN}/cowasm-cc -v -fvisibility-main -Oz ${SRC}/test/hello.c -o ${BUILD}/test/hello.wasm

run-hello.wasm: ${BUILD}/test/hello.wasm
	${CWD}/bin/cowasm ${CWD}/build/test/hello.wasm | grep "Hello from CoWasm!"
.PHONY: run-hello.wasm

${BUILD}/test/cowsay.wasm: ${SRC}/test/cowsay.c
	mkdir -p ${BUILD}/test/
	${BIN}/cowasm-cc -fvisibility-main -Oz ${SRC}/test/cowsay.c -o ${BUILD}/test/cowsay.wasm
run-cowsay.wasm: ${BUILD}/test/cowsay.wasm
	${CWD}/bin/cowasm ${CWD}/build/test/cowsay.wasm "CoWasm -> CowAsm -> Cow Assembly -----> Make a WebAssembly Cow!"
.PHONY: run-cowsay.wasm


${BUILD}/test/misc.wasm: ${SRC}/test/misc.c
	mkdir -p ${BUILD}/test/
	${BIN}/cowasm-cc -v -fvisibility-main -Oz ${SRC}/test/misc.c -o ${BUILD}/test/misc.wasm

run-misc.wasm: ${BUILD}/test/misc.wasm
	${CWD}/bin/cowasm ${CWD}/build/test/misc.wasm
.PHONY: run-misc.wasm

${BUILD}/test/misc.exe: ${SRC}/test/misc.c
	cd ../build && make zig
	mkdir -p ${BUILD}/test/
	zig cc -Oz ${SRC}/test/misc.c -o ${BUILD}/test/misc.exe

run-misc.exe: ${BUILD}/test/misc.exe
	${BUILD}/test/misc.exe
.PHONY: run-misc.exe

test-misc: run-misc.wasm run-cowsay.wasm run-hello.wasm
.PHONY: test-misc
