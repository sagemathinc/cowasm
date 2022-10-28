include ../build/Makefile-vars

all: ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts
	npm ci
	npm run build
	touch ${DIST}/.built

# This is only for use by person maintaining the website.

# This is on github pages so it is forced down to using a Service Worker.
.PHONY: github-pages
github-pages:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/zython.org/docs/
	cd ${HOME}/zython.org/docs/ \
		&& git checkout CNAME \
		&& git add . \
		&& git commit -a -m "update website" \
		&& git push


# This is on cloudflare pages so it can use SharedArrayBuffers
.PHONY: cowasm.org
cowasm.org:
	NODE_ENV="production" npm run build
	rsync -axvH --delete dist/ ${HOME}/cowasm.org/site/
	cd ${HOME}/cowasm.org/site/ \
		&& git add . \
		&& git commit -a -m "update cowasm.org website" \
		&& git push

clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"
