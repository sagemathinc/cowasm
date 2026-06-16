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
CYTHON_WASI_MODULES = fib nt numbers
CYTHON_WASI_C = ${CYTHON_WASI_MODULES:%=${BUILD_WASI_SDK}/%.c}
CYTHON_WASI_SO = ${CYTHON_WASI_MODULES:%=${BUILD_WASI_SDK}/%.so}

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

${BUILD_WASI_SDK}/%.so: ${BUILD_WASI_SDK}/%.c
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
		${WASI_SDK_OBJDUMP} -h ${BUILD_WASI_SDK}/$$module.so | grep 'dylink\.0'; \
		${WASI_SDK_NM} ${BUILD_WASI_SDK}/$$module.so | grep " T PyInit_$${module}$$"; \
		! ${WASI_SDK_STRINGS} ${BUILD_WASI_SDK}/$$module.so | grep 'needed_dynlibs'; \
	done
.PHONY: test-wasi-sdk-next

clean:
	rm -rf *.c build
