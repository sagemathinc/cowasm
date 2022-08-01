all: dist/.built

dist/.built:
	npm ci
	npm run build
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	mkdir -p dist
	touch dist/.built

test:
	npm ci
	npm run build
	cd test/freestanding && make test
	cd test/wasi && make test
.PHONY: test

clean:
	rm -rf dist tsconfig.tsbuildinfo
	cd test/app && make clean
.PHONY: clean
