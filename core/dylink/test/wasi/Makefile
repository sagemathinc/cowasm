all: test-wasm

include ../Makefile-common

WASI_SDK_CLANG = ${BIN}/wasi-sdk-clang-next
WASI_SDK_NM = ${BIN}/wasi-sdk-llvm-nm-next
WASI_SDK_STRINGS = ${BIN}/wasi-sdk-llvm-strings-next
WASI_SDK_AR = ${BIN}/wasi-sdk-llvm-ar-next

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

build/wasm/dynamic-library.wasm.so: dynamic-library.c
	mkdir -p build/wasm
	${COWASM} dynamic-library.c -o build/wasm/dynamic-library.so

build/wasi-sdk/app.wasm: app.c
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-DCOWASM_WASI_SDK_TEST \
		-fPIC \
		-fvisibility=default \
		app.c \
		-o build/wasi-sdk/app.wasm \
		-Wl,--import-memory \
		-Wl,--import-table \
		-Wl,--allow-undefined \
		-Wl,--export-all \
		-Wl,--export=malloc \
		-Wl,--export=free

build/wasi-sdk/archive-callback.o: archive-callback.c
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-DCOWASM_WASI_SDK_TEST \
		-fPIC \
		-nostdlib \
		-c \
		archive-callback.c \
		-o build/wasi-sdk/archive-callback.o

build/wasi-sdk/libarchive-callback.a: build/wasi-sdk/archive-callback.o
	${WASI_SDK_AR} rcs build/wasi-sdk/libarchive-callback.a build/wasi-sdk/archive-callback.o

build/wasi-sdk/dynamic-library.so: dynamic-library.c build/wasi-sdk/libarchive-callback.a
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-DCOWASM_WASI_SDK_TEST \
		-fPIC \
		-shared \
		-nostdlib \
		-mllvm -wasm-enable-sjlj \
		-mllvm -wasm-use-legacy-eh=false \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		-Wl,--export=__wasm_call_ctors \
		dynamic-library.c \
		build/wasi-sdk/libarchive-callback.a \
		-o build/wasi-sdk/dynamic-library.so

build/wasi-sdk/provider.so: provider.c
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-shared \
		-nostdlib \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		-Wl,--export=__wasm_call_ctors \
		provider.c \
		-o build/wasi-sdk/provider.so

build/wasi-sdk/consumer.so: consumer.c build/wasi-sdk/provider.so
	mkdir -p build/wasi-sdk
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-fPIC \
		-shared \
		-nostdlib \
		-Wl,--allow-undefined \
		-Wl,--no-entry \
		-Wl,--export=add_provider_data_relocation \
		consumer.c \
		build/wasi-sdk/provider.so \
		-o build/wasi-sdk/consumer.so

build/wasi-sdk-archive/app.wasm: app.c ../../dist/wasm/libdylink-wasi-sdk.a
	mkdir -p build/wasi-sdk-archive
	${WASI_SDK_CLANG} -target wasm32-wasip1 \
		-O0 \
		-DCOWASM_WASI_SDK_TEST \
		-fPIC \
		-fvisibility=default \
		app.c \
		../../dist/wasm/libdylink-wasi-sdk.a \
		-o build/wasi-sdk-archive/app.wasm \
		-Wl,--import-memory \
		-Wl,--import-table \
		-Wl,--allow-undefined \
		-Wl,--allow-multiple-definition \
		-Wl,--export-all \
		-Wl,--export=malloc \
		-Wl,--export=free

build/wasi-sdk-archive/dynamic-library.so: build/wasi-sdk/dynamic-library.so
	mkdir -p build/wasi-sdk-archive
	cp build/wasi-sdk/dynamic-library.so build/wasi-sdk-archive/dynamic-library.so

build/wasi-sdk-archive/provider.so: build/wasi-sdk/provider.so
	mkdir -p build/wasi-sdk-archive
	cp build/wasi-sdk/provider.so build/wasi-sdk-archive/provider.so

build/wasi-sdk-archive/consumer.so: build/wasi-sdk/consumer.so
	mkdir -p build/wasi-sdk-archive
	cp build/wasi-sdk/consumer.so build/wasi-sdk-archive/consumer.so

build/wasi-sdk/.checked: build/wasi-sdk/app.wasm build/wasi-sdk/dynamic-library.so build/wasi-sdk/provider.so build/wasi-sdk/consumer.so
	node check-wasi-sdk-abi.js build/wasi-sdk/app.wasm build/wasi-sdk/dynamic-library.so
	${WASI_SDK_NM} -a build/wasi-sdk/app.wasm | grep ' U dlopen'
	${WASI_SDK_NM} -a build/wasi-sdk/app.wasm | grep ' U dlsym'
	${WASI_SDK_NM} -a build/wasi-sdk/app.wasm | grep ' T malloc$$'
	${WASI_SDK_NM} -a build/wasi-sdk/app.wasm | grep ' T free$$'
	${WASI_SDK_NM} -a build/wasi-sdk/app.wasm | grep ' T printf$$'
	${WASI_SDK_STRINGS} build/wasi-sdk/dynamic-library.so | grep '^dylink\.0$$'
	${WASI_SDK_STRINGS} build/wasi-sdk/consumer.so | grep 'provider\.so'
	! ${WASI_SDK_STRINGS} build/wasi-sdk/app.wasm | grep 'needed_dynlibs'
	! ${WASI_SDK_STRINGS} build/wasi-sdk/dynamic-library.so | grep 'needed_dynlibs'
	touch build/wasi-sdk/.checked

build/wasi-sdk-archive/.checked: build/wasi-sdk-archive/app.wasm build/wasi-sdk-archive/dynamic-library.so build/wasi-sdk-archive/provider.so build/wasi-sdk-archive/consumer.so
	node check-wasi-sdk-abi.js build/wasi-sdk-archive/app.wasm build/wasi-sdk-archive/dynamic-library.so
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' U dlopen'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' U dlsym'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' T malloc$$'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' T free$$'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' T printf$$'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' T __WASM_EXPORT__malloc$$'
	${WASI_SDK_NM} -a build/wasi-sdk-archive/app.wasm | grep ' T __WASM_EXPORT__printf$$'
	! ${WASI_SDK_STRINGS} build/wasi-sdk-archive/app.wasm | grep 'needed_dynlibs'
	${WASI_SDK_STRINGS} build/wasi-sdk-archive/dynamic-library.so | grep 'archive_callback_probe'
	touch build/wasi-sdk-archive/.checked

test-wasm: build/wasm/app.wasm build/wasm/dynamic-library.wasm.so
	cd build/wasm && node ../../app.js

test-wasi-sdk-next: build/wasi-sdk/.checked
	cd build/wasi-sdk && node ../../app.js

test-wasi-sdk-archive-next: build/wasi-sdk-archive/.checked
	cd build/wasi-sdk-archive && COWASM_DYLINK_CALL_MAIN_CTORS=0 node ../../app.js

# NOTE: We're using gcc here (which is really clang on MacOS), because
# the above with gcc replaced by "zig cc" doesn't build properly for me
# with zig 0.10.0-dev.3315+1a16b7214, surely due to zig bugs.
# TODO: make a version of this that works on Linux.
build/native-macos/app.native: app.c
	mkdir -p build/native-macos
	gcc app.c -o build/native-macos/app.native -ldl

build/native-macos/dynamic-library.native.so: dynamic-library.c
	mkdir -p build/native-macos
	gcc -fPIC dynamic-library.c -c -o build/native-macos/dynamic-library.o
	gcc -shared -undefined dynamic_lookup build/native-macos/dynamic-library.o -o build/native-macos/dynamic-library.so

test-native-macos: build/native-macos/app.native build/native-macos/dynamic-library.native.so
	cd build/native-macos && ./app.native

.PHONY: test test-wasi-sdk-next test-wasi-sdk-archive-next
test: test-wasm
