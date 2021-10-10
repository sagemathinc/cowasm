import wasmImport from "../wasm";

class ComplexNumberClass {
  private re: number;
  private im: number;

  constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }

  __mul__(other: ComplexNumberClass): ComplexNumberClass {
    const re = this.re * other.re - this.im * other.im;
    const im = this.im * other.re + this.re * other.im;
    return new ComplexNumberClass(re, im);
  }
  /*
  __mul2__(other: ComplexNumberClass): ComplexNumberClass {
    wasm.exports.mul(this.re, this.im, other.re, other.im);
    return result;
  }*/

  __add__(other: ComplexNumberClass): ComplexNumberClass {
    return new ComplexNumberClass(this.re + other.re, this.im + other.im);
  }
  __sub__(other: ComplexNumberClass): ComplexNumberClass {
    return new ComplexNumberClass(this.re - other.re, this.im - other.im);
  }
  __div__(other: ComplexNumberClass): ComplexNumberClass {
    const re_num = this.re * other.re + this.im * other.im;
    const im_num = this.im * other.re - this.re * other.im;
    const den = other.re * other.re + other.im * other.im;

    return new ComplexNumberClass(re_num / den, im_num / den);
  }
  __abs__(): number {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }
  __repr__() {
    if (!this.im) return this.re.toString();
    if (!this.re) return `${this.im}*I`;
    return `${this.re} + ${this.im}*I`;
  }
  exp() {
    wasm.exports.exp(this.re, this.im);
    return result;
  }
}

export function ComplexNumber(re: number, im: number): ComplexNumberClass {
  return new ComplexNumberClass(re, im);
}

/*

Using WASM/Zig turns out to be about 20x slower for **multiplication** since
Javascript is so good at JIT for this and there is extra overhead moving two
floats back via a function call (maybe pointers would be better?). For functions
this approach is probably good and at least saves implementation time.

*/

let result: ComplexNumberClass = new ComplexNumberClass(0, 0);
function sendComplex(re: number, im: number) {
  result = new ComplexNumberClass(re, im);
}

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("complex/complex", {
    env: { sendComplex },
    noWasi: true,
  });
}
init();
