include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

# This is only for use by person maintaining the website.
.PHONY: publish
publish:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/zython.cocalc.com/

.PHONY: github-pages
github-pages:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/zython.org/docs/
	cd ${HOME}/zython.org/docs/ \
		&& git checkout CNAME \
		&& git add . \
		&& git commit -a -m "update website" \
		&& git push

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
