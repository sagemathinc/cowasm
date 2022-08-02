all: dist/.built

node_modules:
	npm ci

dist/libc.js: node_modules src/libc.ts
	npm run build

dist/index.js: src/index.ts
	npm run build

dist/libc.c: dist/libc.js
	node ./dist/libc.js > dist/libc.c

dist/.built: dist/libc.c dist/index.js
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	touch dist/.built

test:
	npm ci
	npm run build
	cd test/freestanding && make test
	cd test/wasi && make test
	cd test/python-extension && make test
.PHONY: test

clean:
	rm -rf dist tsconfig.tsbuildinfo
	cd test/freestanding && make clean
	cd test/wasi && make clean
	cd test/python-extension && make clean

.PHONY: clean
