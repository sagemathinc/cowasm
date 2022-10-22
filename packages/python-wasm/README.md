This provides a Javascript library interface to cPython, suitable for
use in a nodejs program or in a web browser. 

This is NOT used in any way by the `python-wasm` command line script, 
which just directly runs the python*.wasm binary (with a main) that is
created as part of building cPython.  Thus this can depend on packages 
like py-numpy that use python-wasm for their build.
