# POSIX

This isn't strictly speaking exactly posix.  It's more of a "clib that is missing from WASI that is needed to build interesting programs such as Python".  That said, Python tries to support a large amount of POSIX, so this is pretty similar.

## Testing

Note that a lot of the testing for this code is done in the python\-wasm package,
because that is what motivated writing this, and it's easiest to write tests in python to test this calls that were motivated by that functionality.

There will be similar remarks about other components of CoWasm, probably.

