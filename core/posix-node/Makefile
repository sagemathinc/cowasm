include ../build/Makefile-vars

ifeq ($(UNAME_S),Linux)
  NATIVE_NODE_TARGET = $(if $(filter $(UNAME_M),aarch64 arm64),aarch64-linux-gnu,x86_64-linux-gnu)
  NODE_LDFLAGS =
else
  NATIVE_NODE_TARGET = $(if $(filter $(UNAME_M),arm64),aarch64-macos,x86_64-macos)
  NODE_LDFLAGS = -undefined dynamic_lookup
endif

NODE_CFLAGS = -O2 -fPIC -Wall -Wextra -Wno-unused-parameter

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: dist/index.js dist/${NATIVE_NODE_TARGET}.node
	touch dist/.built

build/headers:
	rm -rf ${BUILD}/headers
	mkdir -p ${BUILD}/headers
	curl --silent --progress-bar --output ${BUILD}/headers.tar.gz `node -p 'process.release.headersUrl'`
	cd ${BUILD} && tar xf headers.tar.gz -C headers --strip-components=1
	rm ${BUILD}/headers.tar.gz

dist/index.js: src/index.ts node_modules
	pnpm exec tsc -b

# Make an "automatic rules pattern".
dist/%.node: build/headers ${SRC}/addon.c
	mkdir -p ${DIST}
	cc ${NODE_CFLAGS} -I${BUILD}/headers/include/node -shared ${SRC}/addon.c ${NODE_LDFLAGS} -o $@

dist/aarch64-macos.node:
dist/x86_64-macos.node:
dist/aarch64-linux-gnu.node:
dist/x86_64-linux-gnu.node:

test: all
	pnpm exec tsc -b
	@# We are not using GitHub actions right now...
	@# The GitHub actions test running crashes for some reason with caching enable, so we disable it
	@# for "make test"; do "npm run test" for the 2x faster cached testing.
	@# pnpm run test-no-cache
	pnpm run test
