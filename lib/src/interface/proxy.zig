const std = @import("std");
const AutoHashMap = std.AutoHashMap;

// A collection of proxy objects of a given type.
// Used to support using our code from Web Assembly.
// The handle assigned to an object is never 0.
pub fn ProxyObjects(comptime T: type) type {
    return struct {
        const Proxy = @This();

        map: AutoHashMap(i32, T),
        nextHandle: i32,

        pub fn init(allocator: *std.mem.Allocator) Proxy {
            var map = AutoHashMap(i32, T).init(allocator);
            return Proxy{ .nextHandle = 0, .map = map };
        }

        pub fn deinit(self: *Proxy) void {
            self.map.deinit();
        }

        pub fn put(self: *Proxy, obj: T) !i32 {
            self.nextHandle += 1;
            if (self.nextHandle == 0) { // handle is *never* 0.
                self.nextHandle += 1;
            }
            while (self.map.contains(self.nextHandle)) : (self.nextHandle += 1) {
                if (self.nextHandle >= 2147483647) {
                    self.nextHandle = -2147483647;
                }
            }
            try self.map.put(self.nextHandle, obj);
            return self.nextHandle;
        }

        pub fn get(self: Proxy, handle: i32) ?T {
            return self.map.get(handle);
        }

        pub fn free(self: *Proxy, handle: i32) void {
            var obj = self.map.get(handle) orelse {
                // no need to do anything.
                return;
            };
            obj.deinit();
            _ = self.map.remove(handle);
        }

        pub fn count(self: Proxy) usize {
            return self.map.count();
        }
    };
}

const expect = std.testing.expect;

test "creating an object and storing it using a handle-based interface container" {
    const p1list = @import("../modular/p1list.zig");
    var Proxy = ProxyObjects(p1list.P1List(i32)).init(std.testing.allocator);
    defer Proxy.deinit();
    const P1 = try p1list.P1List(i32).init(std.testing.allocator, 11);
    const handle = try Proxy.put(P1);
    try expect(handle == 1);
    const P1b = Proxy.get(handle) orelse {
        unreachable;
    };
    try expect(P1b.N == 11);
    try expect(Proxy.count() == 1);
    Proxy.free(handle);
}
