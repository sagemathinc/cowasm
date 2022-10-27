export default function emscripten(_context) {
  return {
    // TODO: figure out what this is... Building zig with target wasm32-emscripten
    // makes it so this is required.  It gets called a lot.  Better to move it to the
    // C level for speed...?
    emscripten_return_address: () => {
      return 0;
    },

    // The python-wasm package defines a real version of this at the compiled level that
    // does something.  The problem is that properly defining these in the kernel packages
    // requires importing a bunch of functionality from Python, which makes the kernel
    // much larger.  We need these though in order to run the standalone python.wasm
    // binary that the cpython build creates, e.g., since that is very useful for build
    // systems, and also doesn't need signal handling (yet).
    _Py_CheckEmscriptenSignals: () => {},
  };
}
