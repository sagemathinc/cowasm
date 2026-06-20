include ../build/Makefile-vars

all: deps ${DIST}/.built

include ../build/Makefile-rules

SAGELITE_DIR = ${CWD}/../../sagemath/sagelite
SAGELITE_ELECTRON_RESOURCES = ${SAGELITE_DIR}/dist/wasi-sdk/electron-resources

${DIST}/.built: node_modules src/index.ts
	pnpm run build
	touch ${DIST}/.built

clean-build::
	pnpm run clean

.PHONY: test-sagelite
test-sagelite: node_modules
	$(MAKE) -C ${SAGELITE_DIR} test-wasi-sdk-standalone
	cd ${SAGELITE_ELECTRON_RESOURCES} && \
	  PYTHONPATH= \
	  COWASM_PYTHON_WASM_NODE="${CWD}/node_modules/python-wasm/dist/node.js" \
	  node ${SAGELITE_DIR}/src/sagelite-electron-smoke.cjs

.PHONY: test-sagelite-manifest
test-sagelite-manifest: node_modules
	./node_modules/.bin/tsc
	node test/sagelite-manifest.test.cjs
	node test/sagelite-forge-resources.test.cjs
	node test/sagelite-runtime.test.cjs

test:
	echo "no tests yet"
