# WASM-Posix library

Note that this is not just implementing parts of POSIX.  E.g., we
add code from musl that is missing from WASI, and we add code from
FreeBSD (say) that is needed to build tools from that OS, etc. 

It's also very much not about emulating the POSIX standard exactly,
or one particular UNIX.
