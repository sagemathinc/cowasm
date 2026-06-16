include ../build/Makefile-vars

# SageMath uses Boehm GC as the conservative garbage collector below libhomfly.
VERSION = 8.2.8
URL = https://mirrors.mit.edu/sage/spkg/upstream/gc/gc-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/gc-${VERSION}.tar.gz
TARBALL_SHA256 = 7649020621cb26325e1fb5c8742590d92fb48ce5c259b502faf7d9fb5dabb160
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

LIBATOMIC_OPS_WASI_SDK = ${PACKAGES}/libatomic-ops/dist/wasi-sdk

${LIBATOMIC_OPS_WASI_SDK}/lib/libatomic_ops.a:
	$(MAKE) -C ${PACKAGES}/libatomic-ops test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.patched: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-config.patch
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${LIBATOMIC_OPS_WASI_SDK}/lib/libatomic_ops.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${LIBATOMIC_OPS_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
