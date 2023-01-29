# Download and install a specific tested version of node
# for your architecture here, so that we can use it for
# building everything else.

include ../Makefile-vars-build

# Find the latest version at https://nodejs.org/dist/latest/
VERSION = 19.5.0

all: ${DIST_NATIVE}/.${VERSION} ${BIN}/node ${BIN}/cowasm-package-path # ${BIN}/pnpm ${BIN}/pnpx 

# Using sed because uname -s --> x86_64 or aarch64, but need x64 or arm64
ARCH = $(shell uname -m | sed s/x86_64/x64/ | sed s/aarch64/arm64/ )

# Using sed, because
#  uname -s --> Linux and Darwin
# but need      linux and darwin
OS = $(shell uname -s  | sed s/Darwin/darwin/ | sed s/Linux/linux/)

TARBALL = ${UPSTREAM}/node-v${VERSION}-${OS}-${ARCH}.tar.xz
URL =  https://nodejs.org/dist/v${VERSION}/node-v${VERSION}-${OS}-${ARCH}.tar.xz

include ../../Makefile-rules

${DIST_NATIVE}/.${VERSION}: ${TARBALL}
	rm -rf ${DIST_NATIVE}
	mkdir -p ${DIST_NATIVE}
	tar xf ${TARBALL} -C ${DIST_NATIVE} --strip-components=1
	touch ${DIST_NATIVE}/.${VERSION}

${BIN}/node: ${DIST_NATIVE}/bin/node
	ln -sf ${DIST_NATIVE}/bin/node ${BIN}/node
	touch ${BIN}/node

#${BIN}/pnpm: ${DIST_NATIVE}/bin/npm
#	echo "YOU MUST INSTALL PNPM YOURSELF for now."
#	${DIST_NATIVE}/bin/npm init -y
#	${DIST_NATIVE}/bin/npm install pnpm
#	# Now switch it to be a pnpm install.  Yes this is weird.
#	./node_modules/.bin/pnpm install
#	./fix-pnpm.sh
#	cp `pwd`/node_modules/.bin/pnpm ${BIN}/pnpm
#	touch ${BIN}/pnpm
#
#${BIN}/pnpx: ${BIN}/pnpm
#	cp `pwd`/node_modules/.bin/pnpx ${BIN}/pnpx
#	touch ${BIN}/pnpx

${BIN}/cowasm-package-path: ${CWD}/cowasm-package-path
	ln -sf ${CWD}/cowasm-package-path ${BIN}/cowasm-package-path
	touch ${BIN}/cowasm-package-path

test: all
	test `echo "console.log(2+3)" | ${BIN}/node` = "5"
