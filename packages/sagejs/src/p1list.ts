import wasmImport from "./wasm";

// @ts-ignore -- typescript doesn't have FinalizationRegistry
const registry = new FinalizationRegistry((handle) => {
  // console.log(`Freeing memory for ${handle}`);
  wasm.P1List_free(handle);
});

export class P1List {
  public readonly N: number;
  private readonly handle: number;

  constructor(N) {
    this.N = N;
    this.handle = wasm.P1List(N);
    registry.register(this, this.handle); // so we get notified when garbage collected.
  }

  count(): number {
    return wasm.P1List_count(this.handle);
  }
}

let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("p1list", { noWasi: true });
}
init();
