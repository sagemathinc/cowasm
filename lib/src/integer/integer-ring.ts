// The ring ZZ.   The main point of this for now is to show how
// to make ZZ('290328028340823904') work in pure Javascript.

import CallableInstance from "callable-instance";  // this is just a few lines of code
import { IntegerClass } from "./integer";

class IntegerRing extends CallableInstance<[number], string> {
  constructor() {
    super("element");
  }

  element(n: number | string, base: number = 10): IntegerClass {
    return new IntegerClass(n, base);
  }
}

const ZZ = new IntegerRing();

export default ZZ;
