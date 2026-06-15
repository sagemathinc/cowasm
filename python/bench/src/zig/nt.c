__attribute__((visibility("default"))) int gcd_impl(int a, int b) {
  while (b != 0) {
    int c = a % b;
    a = b;
    b = c;
  }
  return a;
}
