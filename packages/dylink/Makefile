all: dist/.built

node_modules:
	npm ci
.PHONY: node_modules

dist/libc.js: node_modules src/libc.ts src/func-pointers.ts
	npm run build

dist/libpython.js: node_modules src/libpython.ts src/func-pointers.ts
	npm run build

dist/index.js: src/index.ts
	npm run build

dist/pointers/libc.c: dist/libc.js
	mkdir -p dist/pointers/
	node ./dist/libc.js > dist/pointers/libc.c

dist/pointers/libpython.c: dist/libpython.js
	mkdir -p dist/pointers/
	node ./dist/libpython.js > dist/pointers/libpython.c

dist/.built: dist/pointers/libc.c dist/index.js
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	touch dist/.built

test:
	npm ci
	npm run build
	cd test/freestanding && make test
	cd test/wasi && make test
	cd test/python-extension && make test
.PHONY: test

test-native-macos:
	npm ci
	npm run build
	cd test/freestanding && make test-native-macos
	cd test/wasi && make test-native-macos
	cd test/python-extension && make test-native-macos
.PHONY: test

clean:
	rm -rf dist tsconfig.tsbuildinfo node_modules
	cd test/freestanding && make clean
	cd test/wasi && make clean
	cd test/python-extension && make clean

.PHONY: clean
