include ../build/Makefile-vars

all: deps ${DIST}/.built

include ../build/Makefile-rules

${DIST}/.built: src/index.ts node_modules
	pnpm run build
	touch ${DIST}/.built

# This is on cloudflare pages so it can use SharedArrayBuffers...
.PHONY: cowasm.sh
cowasm.sh: deps
	cd ${HOME}/cowasm.sh/ && git pull
	NODE_ENV="production" pnpm run build
	rsync -axvH --delete dist/ ${HOME}/cowasm.sh/site/
	cp ${SRC}/_headers ${HOME}/cowasm.sh/site/
	cd ${HOME}/cowasm.sh/site/ \
		&& git add . \
		&& git commit -a -m "update cowasm.sh website" \
		&& git push


clean-build::
	rm -rf node_modules

test:
	echo "no tests yet"