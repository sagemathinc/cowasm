all: dist/.built

node_modules:
	npm ci
.PHONY: node_modules

dist/libc.js: node_modules src/libc.ts src/wasm-export.ts
	npm run build

dist/libpython.js: node_modules src/libpython.ts src/wasm-export.ts
	npm run build

dist/index.js: src/index.ts
	npm run build

dist/wasm-export/libc.c: dist/libc.js
	mkdir -p dist/wasm-export/
	node ./dist/libc.js > dist/wasm-export/libc.c

dist/wasm-export/libpython.c: dist/libpython.js
	mkdir -p dist/wasm-export/
	node ./dist/libpython.js > dist/wasm-export/libpython.c

.PHONY: wasm-export
wasm-export: dist/wasm-export/libpython.c dist/wasm-export/libc.c

dist/.built: dist/wasm-export/libc.c dist/index.js
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	touch dist/.built

test:
	npm ci
	npm run build
	cd test/freestanding && make test
	cd test/wasi && make test
	cd test/python-extension && make test
	cd test/malloc && make test
	cd test/python-in-lib && make test
.PHONY: test

test-native-macos:
	npm ci
	npm run build
	cd test/freestanding && make test-native-macos
	cd test/wasi && make test-native-macos
	cd test/python-extension && make test-native-macos
	cd test/malloc && make test-native-macos
.PHONY: test

clean:
	rm -rf dist tsconfig.tsbuildinfo node_modules
	cd test/freestanding && make clean
	cd test/wasi && make clean
	cd test/python-extension && make clean
	cd test/malloc && make clean

.PHONY: clean
