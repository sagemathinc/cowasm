CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: ${DIST}/.built

${DIST}/.built:
	npm ci
	npm run build
	npm run test
	ln -sf ${CWD}/bin/jsage ${CWD}/../../bin/jsage
	ln -sf ${CWD}/bin/jpython ${CWD}/../../bin/jpython
	touch ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules