# This is a Makefile of common definitions that is used by other packages that
# involve building upstream code from source.

# The directory containing the package where the makefile is run, e.g., packages/bzip2
CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

# The directory containing all of the packages.
PACKAGES = ${CWD}/..

# Where the upstream sources are cached
UPSTREAM = ${PACKAGES}/../upstream/sources

# Where sources, e.g., patches, customizations, new code, etc., are stored for this build.
SRC = ${CWD}/src

# Temporary path where we do the build.  These files can always be deleted without impacting
# the artifact in dist.
BUILD = ${CWD}/build
BUILD_NATIVE = ${BUILD}/native
BUILD_WASM = ${BUILD}/wasm

# Where we put the result of the build, e.g., --prefix=${DIST_WASM}
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm


.PHONY: native
native: ${DIST_NATIVE}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}

