/*
Given a list of names of functions, generate C code that define functions
that when called give a pointer to each of these functions.

This is used to ensure that these named functions are all placed in the WASM
function table, which makes using them many orders of magnitude faster.
*/

export default function funcPointers(names: string[]): string {
  const v = Array.from(new Set(names)).sort();
  return `#ifndef FUNCPTR\n#define FUNCPTR(x) __attribute__((visibility("default"))) void* __FUNCPTR__##x() { return &(x);}\n#endif \n\n
${v.map((func) => `FUNCPTR(${func})`).join("\n")}`;
}
