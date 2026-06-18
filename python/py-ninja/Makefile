include ../build/Makefile-vars

all: native ${BIN}/ninja

# Host-side Ninja driver for Meson configure probes on Linux x86_64.
VERSION = 1.13.0
WHEEL = ninja-${VERSION}-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl
URL = https://files.pythonhosted.org/packages/ed/de/0e6edf44d6a04dabd0318a519125ed0415ce437ad5a1ec9b9be03d9048cf/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = fb46acf6b93b8dd0322adc3a4945452a4e774b75b91293bafcc7b7f8e6517dfa

define verify_tarball_sha256
	@if [ -n "${TARBALL_SHA256}" ]; then \
		if command -v sha256sum >/dev/null; then \
			echo "${TARBALL_SHA256}  ${TARBALL}" | sha256sum -c -; \
		else \
			echo "${TARBALL_SHA256}  ${TARBALL}" | shasum -a 256 -c -; \
		fi || { rm -f ${TARBALL}; exit 1; }; \
	fi
endef

${TARBALL}:
	mkdir -p ${UPSTREAM}
	curl -L ${URL} -o ${TARBALL}
	$(verify_tarball_sha256)

.PHONY: fetch-source
fetch-source: ${TARBALL}
	$(verify_tarball_sha256)

${BUILD_NATIVE}/.build: ${TARBALL}
	rm -rf ${BUILD_NATIVE}
	mkdir -p ${BUILD_NATIVE}
	python3 -m zipfile -e ${TARBALL} ${BUILD_NATIVE}
	touch ${BUILD_NATIVE}/.build

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	mkdir -p ${DIST_NATIVE}/bin
	cp ${BUILD_NATIVE}/ninja-${VERSION}.data/scripts/ninja ${DIST_NATIVE}/bin/ninja
	chmod +x ${DIST_NATIVE}/bin/ninja
	touch ${DIST_NATIVE}/.built

${BIN}/ninja: ${DIST_NATIVE}/.built
	ln -sf ${DIST_NATIVE}/bin/ninja ${BIN}/ninja

test: ${DIST_NATIVE}/.built ${BIN}/ninja
	${BIN}/ninja --version | grep ${VERSION}

.PHONY: clean-native
clean-native:
	rm -rf ${BUILD_NATIVE} ${DIST_NATIVE}

.PHONY: clean
clean: clean-native
	rm -rf ${BUILD} ${DIST} node_modules
