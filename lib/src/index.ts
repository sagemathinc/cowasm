// Import and initialize everything.  This is convenient for interactive use.

export { ComplexNumber } from "./complex/complex";
import * as dims from "./modular/dims";
export { dims };
import P1List, { init as p1listInit } from "./modular/p1list";
export { P1List };
import ManinSymbols, {
  init as maninSymbolsInit,
} from "./modular/manin-symbols";
export { ManinSymbols };
import * as factor from "./factor";
export { factor };
import * as arith from "./arith";
export { arith };
import { Integer, init as integerInit, ZZ } from "./integer";
export { Integer, ZZ };
import { Rational, init as rationalInit, QQ } from "./rational";
export { Rational, QQ };
import * as pari from "./pari";
export { pari };
export * as misc from "./misc";

export { Number } from "./number";

export async function init(): Promise<void> {
  await Promise.all([
    dims.init(),
    p1listInit(),
    maninSymbolsInit(),
    factor.init(),
    arith.init(),
    integerInit(),
    rationalInit(),
    /*pari.init(),*/
  ]);
}
init();
