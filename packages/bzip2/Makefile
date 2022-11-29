# We only make the wasm version, since we don't need native for our purposes.
all: wasm

include ../build/Makefile-vars

# See https://github.com/libarchive/bzip2/tags
VERSION=1.0.8
TARBALL = ${UPSTREAM}/bzip2-${VERSION}.tar.gz
URL = https://github.com/libarchive/bzip2/archive/refs/tags/bzip2-${VERSION}.tar.gz

include ../build/Makefile-rules

##################
# NATIVE
##################

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} && \
		make AR="zig ar" \
		CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
		RANLIB="zig ranlib" \
		PREFIX=${DIST_NATIVE} \
		install -j8
	touch ${DIST_NATIVE}/.built

##################
# WASM
##################

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ../zig && make
	cp ${SRC}/extra_config.h ${BUILD_WASM}
	cd ${BUILD_WASM} \
		&&  echo '#include "extra_config.h"' >> bzlib.h \
		&&	make -j8 \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main" \
			RANLIB="zig ranlib" \
			PREFIX="${DIST_WASM}" \
			install \
		&&  cp extra_config.h ${DIST_WASM}/include/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	cd ../node && make
	# compress and decompress a file using the bzip2 and bunzip2 WASM executables.
	echo "coWasm" > ${BUILD_WASM}/testfile.txt
	${BIN}/cowasm ${DIST_WASM}/bin/bzip2 ${BUILD_WASM}/testfile.txt
	${BIN}/cowasm ${DIST_WASM}/bin/bunzip2 ${BUILD_WASM}/testfile.txt.bz2
	cat  ${BUILD_WASM}/testfile.txt |grep coWasm
	rm ${BUILD_WASM}/testfile.txt

