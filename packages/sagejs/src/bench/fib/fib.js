function fib(n) {
  if (n <= 1) {
    return 1;
  }
  return fib(n - 1) + fib(n - 2);
}

exports.bench = function bench(n = 35) {
  t = new Date();
  console.log(fib(n), `${new Date() - t} ms`);
};
