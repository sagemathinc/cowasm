export fn gcd_impl(a: c_int, b: c_int) c_int {
    var c: c_int = undefined;
    var a0 = a;
    var b0 = b;
    while (b0 != 0) {
        c = @mod(a0, b0);
        a0 = b0;
        b0 = c;
    }
    return a0;
}
