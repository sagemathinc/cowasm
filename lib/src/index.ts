// Import and initialize everything.  This is convenient for interactive use.

import * as python from "./python";
export { python };

export async function init(): Promise<void> {
  await Promise.all([python.init()]);
}
init();
