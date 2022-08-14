// posix-zig binaries should work across a very wide range of nodejs versions
// for their given architecture.
//
// "For an addon to remain ABI-compatible across Node.js major versions, it must use
//  Node-API exclusively by restricting itself to using #include <node_api.h>."
//
//        -- https://nodejs.org/api/n-api.html
//
// TODO: In https://nodejs.org/api/n-api.html#usage they explain that we can do something
// like "#define NAPI_VERSION 3" to ensure our code all works with a specific range
// of nodejs versions.

pub usingnamespace @cImport({
    @cInclude("node_api.h");
});
