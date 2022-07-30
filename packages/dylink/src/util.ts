//import debug from "debug";
//const log = debug("dylink:util");

export function showTable(table) {
  const v: number[] = [];
  for (let i = 0; i < table.length; i++) {
    v.push(table.get(i) != null ? 1 : 0);
  }
  console.log(v);
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
