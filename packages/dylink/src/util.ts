//import debug from "debug";
//const log = debug("dylink:util");

export function nonzeroPositions(table) {
  const v: number[] = [];
  for (let i = 0; i < table.length; i++) {
    if (table.get(i) != null) {
      v.push(i);
    }
  }
  return v;
}

const textDecoder = new TextDecoder(); // utf-8

export function recvString(
  charPtr: number,
  memory: WebAssembly.Memory
): string {
  const len = strlen(charPtr, memory);
  const slice = memory.buffer.slice(charPtr, charPtr + len);
  return textDecoder.decode(slice);
}

export function strlen(charPtr: number, memory: WebAssembly.Memory): number {
  const mem = new Uint8Array(memory.buffer);
  let i = charPtr;
  while (mem[i]) {
    i += 1;
  }
  return i - charPtr;
}

export function alignMemory(size: number, alignment: number): number {
  return Math.ceil(size / alignment) * alignment;
}

export function MBtoPages(MB): number {
  // "Note: A WebAssembly page has a constant size of 65,536 bytes, i.e., 64KiB." from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory/Memory
  // There's thus 1025/64 = 16 pages in a MB.
  return MB * 16.
}
