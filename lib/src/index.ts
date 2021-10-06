// Import and initialize everything.  This is convenient for interactive use.

import * as dims from "./modular/dims";
export { dims };
import P1List, { init as p1listInit } from "./modular/p1list";
export { P1List };
import * as factor from "./factor";
export { factor };
import * as arith from "./arith";
export { arith };
import Integer, { init as integerInit } from "./integer/integer";
export { Integer };
//import * as pari from "./pari";
//export { pari };

export async function init(): Promise<void> {
  await dims.init();
  await p1listInit();
  await factor.init();
  await arith.init();
  await integerInit();
  //await pari.init();
}
init();
