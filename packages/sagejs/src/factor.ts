import wasmImport from "./wasm";

let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("factor", {
    env: {
      sendPrimePower,
      reportError: () => {
        throw Error("error");
      },
    },
    noWasi: true,
  });
}

interface PrimePower {
  p: number;
  e: number;
}

let v: PrimePower[] = [];
function sendPrimePower(p, e) {
  v.push({ p, e });
}

export function factorTrialDivision(N: number) {
  if (N < 1 || N > 2147483647) {
    throw Error("N must be a positive 32-bit signed int");
  }
  v = [];
  wasm.factorTrialDivision(N);
  return v;
}
