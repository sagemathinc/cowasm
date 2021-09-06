all: packages/gmp/dist/local

packages/gmp/dist/.built:
	cd packages/gmp && npm run build

packages/mpir/dist/.built:
	cd packages/mpir && npm run build

clean:
	rm -rf packages/*/build packages/*/dist

