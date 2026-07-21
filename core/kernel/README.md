# @cowasm/kernel: Collaborative WebAssembly for Servers and Browsers

DEMOS:

- https://cowasm.org  (uses Atomics and SharedArrayBuffers)
- https://zython.org (uses Service Workers)

See [the main repo](https://github.com/sagemathinc/cowasm/blob/main/README.md) for more information.

## Runtime host marker

The Node and browser kernel entrypoints set the reserved `COWASM_RUNTIME`
environment value to `node` or `browser` after applying caller-provided
environment options. WASI packages can use this host-controlled value when
`sys.platform` or the equivalent guest-platform API is not specific enough.
