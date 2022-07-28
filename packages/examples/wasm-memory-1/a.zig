extern fn deref_add1(a: *const i32) i32;

var z: i32 = 0;
export fn next(a: i32) i32 {
    z = a;
    return deref_add1(&z);
}

export fn add1(a: i32) i32 {
    return a + 1;
}

export fn callmany() void {
    var i: i32 = 0;
    while (i < 100000000) : (i += 1) {
        _ = add1(i);
    }
}
