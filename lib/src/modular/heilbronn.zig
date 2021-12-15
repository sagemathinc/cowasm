// We will implement Heilbronn matrices here.
// See sage/src/sage/modular/modsym/heilbronn.pyx
const std = @import("std");
const Mat2x2 = @import("./mat2x2.zig").Mat2x2;

pub fn HeilbronnCremona(comptime T: type) type {
    return struct {
        const HC = @This();
        p: T,
        v: std.ArrayList(Mat2x2(T)),

        pub fn init(allocator: std.mem.Allocator, p: T) !HC {
            var v = std.ArrayList(Mat2x2(T)).init(allocator);

            try v.append(Mat2x2(T).init(1, 0, 0, p));

            if (p == 2) {
                try v.append(Mat2x2(T).init(2, 0, 0, 1));
                try v.append(Mat2x2(T).init(2, 1, 0, 1));
                try v.append(Mat2x2(T).init(1, 0, 1, 2));
            } else {
                var r: T = @divTrunc(-p, 2);
                while (r <= @divTrunc(p, 2)) : (r += 1) {
                    var x1 = p;
                    var x2 = -r;
                    var y1: T = 0;
                    var y2: T = 1;
                    var a = -p;
                    var b = r;
                    var c: T = 0;
                    var x3: T = 0;
                    var y3: T = 0;
                    var q: T = 0;
                    try v.append(Mat2x2(T).init(x1, x2, y1, y2));

                    while (b != 0) {
                        q = @floatToInt(T, @round(@intToFloat(f64, a) / @intToFloat(f64, b)));
                        c = a - b * q;
                        a = -b;
                        b = c;
                        x3 = q * x2 - x1;
                        x1 = x2;
                        x2 = x3;
                        y3 = q * y2 - y1;
                        y1 = y2;
                        y2 = y3;
                        try v.append(Mat2x2(T).init(x1, x2, y1, y2));
                    }
                }
            }

            return HC{ .p = p, .v = v };
        }

        pub fn deinit(self: *HC) void {
            self.v.deinit();
        }

        pub fn count(self: HC) usize {
            return self.v.items.len;
        }

        pub fn get(self: HC, n: usize) !Mat2x2(T) {
            return self.v.items[n];
        }

        pub fn print(self: HC) void {
            var i: usize = 0;
            while (i < self.v.items.len) : (i += 1) {
                self.v.items[i].print();
            }
        }
    };
}

const test_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "HC matrices for p=2" {
    var h = try HeilbronnCremona(i32).init(test_allocator, 2);
    defer h.deinit();
    try expect(h.count() == 4);
    try expect((try h.get(1)).eql(Mat2x2(i32).init(2, 0, 0, 1)));
    //h.print();
}

test "HC matrices for p=3" {
    var h = try HeilbronnCremona(i32).init(test_allocator, 3);
    defer h.deinit();
    try expect(h.count() == 6);
    try expect((try h.get(5)).eql(Mat2x2(i32).init(-1, 0, 1, -3)));
    //h.print();
}

test "HC matrices for p=5" {
    var h = try HeilbronnCremona(i32).init(test_allocator, 5);
    defer h.deinit();
    try expect(h.count() == 12);
    try expect((try h.get(11)).eql(Mat2x2(i32).init(1, 0, -3, 5)));
    //h.print();
}

// sage: sum((sum(x) for x in HeilbronnCremona(10007)))
// 97753902
test "HC matrices for p=10007 -- sum all up" {
    var h = try HeilbronnCremona(i32).init(test_allocator, 10007);
    defer h.deinit();
    try expect(h.count() == 67698);
    var a: i64 = 0;
    var i: usize = 0;
    while (i < h.count()) : (i += 1) {
        var m = try h.get(i);
        a += m.a + m.b + m.c + m.d;
    }
    try expect(a == 97753902);
}

// const time = std.time.milliTimestamp;
// fn bench(p:i32) !void {
//     var t = time();
//     var h = try HeilbronnCremona(i32).init(test_allocator, p);
//     defer h.deinit();
//     std.debug.print("p={}, time = {}ms, count = {}\n", .{ p, time() - t, h.count() });
// }
// test "bench" {
//     try bench(100003);
//     try bench(1000003);
// }
