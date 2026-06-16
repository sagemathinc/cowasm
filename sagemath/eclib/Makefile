include ../build/Makefile-vars

# https://github.com/JohnCremona/eclib/releases
VERSION = 20250627
URL = https://github.com/JohnCremona/eclib/releases/download/${VERSION}/eclib-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/eclib-${VERSION}.tar.bz2
TARBALL_SHA256 = b88d4b52612e491c5415946d9e35f2062ca1015ee7fbbe0b61f158fa74cb4bc9
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
NTL_WASI_SDK = ${PACKAGES}/ntl/dist/wasi-sdk
PARI_WASI_SDK = ${PACKAGES}/pari/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmpxx.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${NTL_WASI_SDK}/lib/libntl.a:
	$(MAKE) -C ${PACKAGES}/ntl test-wasi-sdk-standalone

${PARI_WASI_SDK}/lib/libpari.a:
	$(MAKE) -C ${PACKAGES}/pari test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmpxx.a ${NTL_WASI_SDK}/lib/libntl.a ${PARI_WASI_SDK}/lib/libpari.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${NTL_WASI_SDK} ${PARI_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
