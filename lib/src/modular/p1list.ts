import wasmImport from "../wasm";

// @ts-ignore -- typescript doesn't have FinalizationRegistry
const registry = new FinalizationRegistry((handle) => {
  // console.log(`Freeing memory for ${handle}`);
  wasm.exports.P1List_free(handle);
});

export class P1List {
  public readonly N: number;
  private readonly handle: number;

  constructor(N) {
    this.N = N;
    this.handle = wasm.exports.P1List(N);
    registry.register(this, this.handle); // so we get notified when garbage collected.
  }

  count(): number {
    return wasm.exports.P1List_count(this.handle);
  }

  normalize(u: number, v: number): [number, number] {
    wasm.exports.P1List_normalize(this.handle, u, v);
    return result;
  }

  normalize_with_scalar(u: number, v: number): [number, number] {
    wasm.exports.P1List_normalize_with_scalar(this.handle, u, v);
    return result;
  }

  index(u: number, v: number): number {
    return wasm.exports.P1List_index(this.handle, u, v);
  }

  __repr__(): string {
    return `P1List(${this.N})`;
  }
}

let result;
function P1List_normalize_cb(u, v): void {
  result = [u, v];
}
function P1List_normalize_with_scalar_cb(u, v, s): void {
  result = [u, v, s];
}

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/p1list", {
    env: { P1List_normalize_cb, P1List_normalize_with_scalar_cb },
  });
}
init();
