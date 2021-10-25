// The field QQ.

import CallableInstance from "callable-instance"; // this is just a few lines of code
import { RationalNumber } from "./rational";

class RationalField extends CallableInstance<[number], string> {
  constructor() {
    super("element");
  }

  __str__() {
    return "Rational Field";
  }

  element(n: number | string, base: number = 10): RationalNumber {
    return new RationalNumber(n, base);
  }
}

const QQ = new RationalField();

export default QQ;
