/*
Given a list of names of functions and symbols, generate C code that define functions
that when called give a pointer to each of these.

For functions, this ensures that these named functions are all placed in the WASM
function table, which makes using them many orders of magnitude faster.

For symbols, it ensures that we have access to them at all (and quickly) so that
the GOTMemHandler (global offset table memory handler) can tell dynamic libraries
where the symbols are in memory.
*/

const MACRO = `
#ifndef WASM_EXPORT
#define WASM_EXPORT(x) __attribute__((visibility("default"))) void* __WASM_EXPORT__##x() { return &(x);}
#endif
`;

export default function wasmExport(names: string[]): string {
  const v = Array.from(new Set(names)).sort();
  return `${MACRO}\n
${v
  .filter((func) => func.trim())
  .map((func) => `WASM_EXPORT(${func})`)
  .join("\n")}`;
}
