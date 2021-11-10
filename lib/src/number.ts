/* How numerical literals are parsed in JSage.

For now:

Integers = Arbitrary precision.
Floats = normal javascript floats.

As soon as we expose mpfr functionality (say), then
use that here... but make sure to take into account
the approach Robert Bradshaw implemented in Sage with
real literals?
*/

import { IntegerClass } from "./integer/integer";

export function Number(s): IntegerClass | number {
  if (s.includes(".")) {
    return parseFloat(s);
  } else {
    return new IntegerClass(s, undefined, 10);
  }
}
