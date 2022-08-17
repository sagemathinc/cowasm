// Create a simulated posix environment for the browser.
// We will want to move this to its own package.
// It makes more sense though to put all the assumptions about what "posix in the browser" is in
// its own module, rather than randomly in the files in  src/wasm/posix.
// Also, we can ensure this has the same interface as posix-zig provides.
// TODO: Maybe this goes in posix-zig as the fallback in case we're on Windows (say).

import type { Posix } from "posix-zig";

const posix: Posix = {
  getpid: () => {
    return process.pid;
  },

  getppid: () => {
    return posix.getpid?.() ?? 1;
  },
};

export default posix;
