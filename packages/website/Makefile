include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

# This is only for use by person maintaining the website.

.PHONY: cowasm.org
cowasm.org:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/cowasm.org/docs/
	cd ${HOME}/cowasm.org/docs/ \
		&& git checkout CNAME \
		&& git add . \
		&& git commit -a -m "update website" \
		&& git push

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
