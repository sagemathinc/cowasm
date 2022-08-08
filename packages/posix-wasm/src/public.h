#ifndef PUBLIC
#define PUBLIC(x) __attribute__((visibility("default"))) void* __WASM_EXPORT__##x() { return &(x);}
#endif

