// Import and initialize everything.  This is convenient for interactive use.

import * as dims from "./modular/dims";
export { dims };
import * as p1list from "./modular/p1list";
export { p1list };
import * as factor from "./factor";
export { factor }
import * as arith from "./arith";
export { arith }
import * as integer from "./integer";
export { integer };
import * as pari from "./pari";
export { pari };


export async function init(): Promise<void> {
  await dims.init();
  await p1list.init();
  await factor.init();
  await arith.init();
  await integer.init();
  await pari.init();
}
init();
