all:
	npm ci
	npm run build
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	mkdir -p dist
	touch dist/.built

test:
	cd test/app && make test
.PHONY: test

clean:
	rm -rf dist
	cd test/app && make clean
.PHONY: clean
