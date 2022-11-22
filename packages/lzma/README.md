# lzma web assembly

This seems to work well to support tar and the python lzma module.

When run standalone via cowasm it seems to work well, e.g. `make test` does this.

It seems horribly broken when used from within `dash-wasm`, e.g.,
when used from cowasm.sh.