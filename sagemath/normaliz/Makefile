include ../build/Makefile-vars

# Normaliz provides computations in affine monoids, vector configurations,
# lattice polytopes, and rational cones.
VERSION = 3.11.1
URL = https://github.com/Normaliz/Normaliz/releases/download/v${VERSION}/normaliz-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/normaliz-${VERSION}.tar.gz
TARBALL_SHA256 = 9a00d590f0fdcad847e2189696d2842d97ed896ed36c22421874a364047f76e8
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
