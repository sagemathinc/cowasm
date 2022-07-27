extern fn add1(a: i32) i32;

export fn ptr_add1(a: *const i32) i32 {
    var i :i32 = 0;
    while (i < 100000000) : (i += 1) {
        _ = add1(i);
    }

    return add1(a.*);
}
