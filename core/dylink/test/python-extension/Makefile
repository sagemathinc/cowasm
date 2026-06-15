all: test-wasm

include ../Makefile-common

WASI_SDK_CLANG = ${BIN}/wasi-sdk-clang-next
WASI_SDK_OBJDUMP = ${BIN}/wasi-sdk-llvm-objdump-next
WASI_SDK_STRINGS = ${BIN}/wasi-sdk-llvm-strings-next

build/wasm/app.wasm: app.c
	mkdir -p build/wasm
	${ZIG} cc -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c \
		-L../../dist/wasm/ -ldylink \
		-o build/wasm/app.wasm \
		-Xlinker --import-memory \
		-Xlinker --import-table

build/wasm/app.o: app.c
	mkdir -p build/wasm
	${ZIG} cc -v -target wasm32-wasi \
		-rdynamic \
		-shared \
		-fvisibility=default \
		app.c build/wasm/libc.o -c -o build/wasm/app.o

build/wasm/hello.so: hellomodule.c
	mkdir -p build/wasm
	${COWASM} hellomodule.c -o build/wasm/hello.so

test-wasm: build/wasm/app.wasm build/wasm/hello.so
	cd build/wasm && node ../../app.js

build/wasi-sdk/app.wasm: app.c
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-fvisibility=default \
		app.c \
		-lm \
		-o build/wasi-sdk/app.wasm \
		-Wl,--import-memory \
		-Wl,--import-table \
		-Wl,--allow-undefined \
		-Wl,--export-all \
		-Wl,--export=malloc \
		-Wl,--export=free

build/wasi-sdk/hello.so: hellomodule.c
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-DCOWASM_WASI_SDK_STANDALONE \
		-shared \
		-nostdlib \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		-Wl,--export=PyInit_hello \
		hellomodule.c \
		-o build/wasi-sdk/hello.so

build/wasi-sdk/.checked: build/wasi-sdk/app.wasm build/wasi-sdk/hello.so
	${WASI_SDK_OBJDUMP} -h build/wasi-sdk/hello.so | grep 'dylink\.0'
	${WASI_SDK_STRINGS} build/wasi-sdk/hello.so | grep '^PyInit_hello$$'
	${WASI_SDK_STRINGS} build/wasi-sdk/hello.so | grep '^hello$$'
	! ${WASI_SDK_STRINGS} build/wasi-sdk/app.wasm | grep 'needed_dynlibs'
	! ${WASI_SDK_STRINGS} build/wasi-sdk/hello.so | grep 'needed_dynlibs'
	touch build/wasi-sdk/.checked

test-wasi-sdk-next: build/wasi-sdk/.checked
	cd build/wasi-sdk && node ../../app.js

# NOTE: We're using gcc here (which is really clang on MacOS), because
# the above with gcc replaced by "zig cc" doesn't build properly for me
# with zig 0.10.0-dev.3315+1a16b7214, surely due to zig bugs.
# TODO: make a version of this that works on Linux.
build/native-macos/app.native: app.c
	mkdir -p build/native-macos
	gcc app.c -o build/native-macos/app.native -ldl

build/native-macos/hello.so: hellomodule.c
	mkdir -p build/native-macos
	gcc -fPIC hellomodule.c -c -o build/native-macos/hellomodule.o
	gcc -shared -undefined dynamic_lookup build/native-macos/hellomodule.o -o build/native-macos/hello.so

test-native-macos: build/native-macos/app.native build/native-macos/hello.so
	cd build/native-macos && ./app.native

.PHONY: test
test: test-wasm

.PHONY: test-wasi-sdk-next

clean:
	rm -rf build
