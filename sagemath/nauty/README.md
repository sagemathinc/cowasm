# nauty

This package builds nauty and Traces graph automorphism tools for CoWasm's
wasi-sdk standalone toolchain.

The standalone smoke builds the static nauty archive and selected installed
programs with CPU-specific probes and interrupt handling disabled for WASI. It
links a C probe for nauty and Traces cycle automorphisms, then runs `geng`,
`countg`, and `showg` on connected graphs under the WASI runner.
