CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist

all: ${DIST}/.built

${DIST}/.built:
	npm ci
	npm run build
	ln -sf ${CWD}/bin/jpython ${CWD}/../../bin/jpython
	touch ${DIST}/.built

test: ${DIST}/.built
	npm run test

.PHONY: bench
bench:
	echo "STARTING jpython benchmark suite"
	npx jpython `pwd`/bench/all.py
	echo "FINISHED jpython benchmark suite"

clean:
	rm -rf ${DIST} node_modules
