const std = @import("std");

pub fn Mat2x2(comptime T: type) type {
    return struct {
        const Mat = @This();
        a: T,
        b: T,
        c: T,
        d: T,
        pub fn init(a: T, b: T, c: T, d: T) Mat {
            return Mat{ .a = a, .b = b, .c = c, .d = d };
        }
        pub fn print(self: Mat) void {
            std.debug.print("[{},{}; {},{}]\n", .{ self.a, self.b, self.c, self.d });
        }
        pub fn eql(x: Mat, y: Mat) bool {
            return x.a == y.a and x.b == y.b and x.c == y.c and x.d == y.d;
        }
    };
}

test "Make a matrix" {
    var m = Mat2x2(i32){ .a = 1, .b = 2, .c = 3, .d = 4 };
    try std.testing.expect(m.eql(m));
    var n = Mat2x2(i32){ .a = -1, .b = 2, .c = 3, .d = 4 };
    try std.testing.expect(!m.eql(n));
}
