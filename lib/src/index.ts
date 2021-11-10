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
  await dims.init();
  await p1listInit();
  await maninSymbolsInit();
  await factor.init();
  await arith.init();
  await integerInit();
  await rationalInit();
  //await pari.init(); // it takes noticeable time and default init might not be good.
}
init();
