#include "app.h"

int provider_value = 41;

#ifndef WASM_EXPORT
#define WASM_EXPORT(x) __attribute__((visibility("default"))) void* __WASM_EXPORT__##x() { return &(x);}
#endif

WASM_EXPORT(provider_value)

