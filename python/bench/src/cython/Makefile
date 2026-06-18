all: build bench

ROOT = ../../../..
BIN = ${ROOT}/bin
BUILD_WASI_SDK = build/wasi-sdk
CPYTHON_WASM = ${ROOT}/python/cpython/dist/wasm
POSIX_WASI_SDK = ${ROOT}/core/posix-wasm/dist/wasi-sdk
PY_CYTHON = ${ROOT}/python/py-cython/dist/wasm
PYTHON_INCLUDE = ${CPYTHON_WASM}/include/python3.14
WASI_SDK_CLANG = ${BIN}/wasi-sdk-clang-next
WASI_SDK_NM = ${BIN}/wasi-sdk-llvm-nm-next
WASI_SDK_OBJDUMP = ${BIN}/wasi-sdk-llvm-objdump-next
WASI_SDK_STRINGS = ${BIN}/wasi-sdk-llvm-strings-next
PYTHON_EXTENSION_SUFFIX = .cpython-314-wasm32-wasi.so
CYTHON_WASI_MODULES = fib nt numbers
CYTHON_WASI_C = ${CYTHON_WASI_MODULES:%=${BUILD_WASI_SDK}/%.c}
CYTHON_WASI_SO = ${CYTHON_WASI_MODULES:%=${BUILD_WASI_SDK}/%${PYTHON_EXTENSION_SUFFIX}}

build:
	python-wasm setup.py build
.PHONY: build

bench:
	python-wasm all.py

${BUILD_WASI_SDK}/fib.c: fib.pyx
	mkdir -p ${BUILD_WASI_SDK}
	PYTHONPATH=${PY_CYTHON} python3 -m cython -3 --output-file $@ fib.pyx

${BUILD_WASI_SDK}/nt.c: nt.pyx nt.pxd
	mkdir -p ${BUILD_WASI_SDK}
	PYTHONPATH=${PY_CYTHON} python3 -m cython -3 --output-file $@ nt.pyx

${BUILD_WASI_SDK}/numbers.c: numbers.pyx nt.pxd
	mkdir -p ${BUILD_WASI_SDK}
	PYTHONPATH=${PY_CYTHON} python3 -m cython -3 --output-file $@ numbers.pyx

${BUILD_WASI_SDK}/%${PYTHON_EXTENSION_SUFFIX}: ${BUILD_WASI_SDK}/%.c
	cd ${ROOT}/core/build && make wasi-sdk-next
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-D_SCHED_H \
		-shared \
		-nostdlib \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		-Wl,--export=PyInit_$* \
		-I${PYTHON_INCLUDE} \
		-I${POSIX_WASI_SDK} \
		$< \
		-o $@

test-wasi-sdk-next: ${CYTHON_WASI_SO}
	@set -e; \
	for module in ${CYTHON_WASI_MODULES}; do \
		extension=${BUILD_WASI_SDK}/$$module${PYTHON_EXTENSION_SUFFIX}; \
		${WASI_SDK_OBJDUMP} -h $$extension | grep 'dylink\.0'; \
		${WASI_SDK_NM} $$extension | grep " T PyInit_$${module}$$"; \
		! ${WASI_SDK_STRINGS} $$extension | grep 'needed_dynlibs'; \
	done; \
	PYTHONPATH=${BUILD_WASI_SDK}:$(CURDIR) ${BIN}/python-wasm test_wasi_runtime.py
.PHONY: test-wasi-sdk-next

clean:
	rm -rf *.c build
