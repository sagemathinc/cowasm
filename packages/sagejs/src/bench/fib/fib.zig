// zig test fib.zig -O ReleaseFast

const std = @import("std");
const time = std.time.milliTimestamp;

fn fib(comptime T: type, n: i32) T {
    if (n <= 1) {
        return @as(T, 1);
    }
    return fib(T, n - 1) + fib(T, n - 2);
}

fn bench(comptime T: type, n: anytype) void {
    var t = time();
    std.debug.print("\nfib({}) = {}, {}ms\n", .{ n, fib(T, n), (time() - t) });
}

test "try it on some values of n using i32" {
    bench(i32, 10);
    bench(i32, 20);
    bench(i32, 30);
    bench(i32, 35);
    bench(i32, 40);
}

test "try it on some values of n using i16" {
    bench(i16, 10);
    bench(i16, 20);
}

test "try it on some values of n using i64" {
    bench(i64, 30);
    bench(i64, 35);
    bench(i64, 40);
}

test "try up to 45" {
    var i : i32 = 1;
    while (i<=45) : (i+=1) {
        bench(i32, i);
    }
}