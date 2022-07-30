all:
	npm ci
	npm run build
	cd ../../bin && ln -sf ../packages/dylink/bin/zig-fPIC .
	mkdir -p dist
	touch dist/.built

clean:
	rm -rf dist