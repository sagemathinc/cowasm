include ../build/Makefile-vars

# Notes:
#   - using -OReleaseSmall or -OReleaseFast with zig v 0.10.0-dev.4161+dab5bb924 cause a segfault.
#   - using -OReleaseSafe breaks some tests.
#   - the default -ODebug works fine with all tests passing.  I'm fine with this settting, since this code
#     is really a wrapper layer to the underlying C library between Javascript and WASM, and the
#     Javascript overhead is orders of magnitude more.
OPTS = -mcpu=baseline -ODebug

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: dist/index.js dist/aarch64-macos.node dist/x86_64-macos.node dist/aarch64-linux-gnu.node dist/x86_64-linux-gnu.node
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
dist/%.node: build/headers $(shell find src/*.zig -type f)
	cd ../build && make zig
	mkdir -p ${DIST}
	zig build-lib ${OPTS} --cache-dir ${BUILD}/zig-cache -dynamic -lc -isystem ${BUILD}/headers/include/node ${SRC}/lib.zig -fallow-shlib-undefined -target $* -femit-bin=$@

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

