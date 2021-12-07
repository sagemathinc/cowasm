CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: ${DIST}/.built

${DIST}/.built:
	npm ci
	npm run build
	touch ${DIST}/.built

clean:
	rm -rf ${DIST} node_modules