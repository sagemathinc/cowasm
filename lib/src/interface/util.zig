extern fn reportError(ptr: [*]const u8, len: usize) void;

pub fn throw(s: [*]const u8) void {
    var i: usize = 0;
    while (s[i] != 0) : (i += 1) {}
    reportError(s, i);
}
