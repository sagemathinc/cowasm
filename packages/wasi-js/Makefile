include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built:
	npm ci
	npm run build
	touch ${DIST}/.built

test:
	echo "no tests yet"
