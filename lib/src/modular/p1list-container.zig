const p1list = @import("./p1list.zig");
const std = @import("std");
const AutoHashMap = std.AutoHashMap;
const P1List = p1list.P1List;

pub fn P1Lists(comptime T: type) type {
    return struct {
        map: AutoHashMap(i32, P1List(T)),
        i: i32,

        pub fn init(allocator: *std.mem.Allocator) P1Lists(T) {
            var map = AutoHashMap(i32, P1List(T)).init(allocator);
            return P1Lists(T){ .i = 0, .map = map };
        }

        pub fn deinit(self: *P1Lists(T)) void {
            self.map.deinit();
        }

        pub fn put(self: *P1Lists(T), P1: P1List(T)) !i32 {
            self.i += 1;
            while (self.map.contains(self.i)) : (self.i += 1) {
                if (self.i >= 2147483647) {
                    self.i = -2147483647;
                }
            }
            try self.map.put(self.i, P1);
            return self.i;
        }

        pub fn get(self: P1Lists(T), handle: i32) ?P1List(T) {
            return self.map.get(handle);
        }

        pub fn free(self: *P1Lists(T), handle: i32) void {
            const P1 = self.map.get(handle) orelse {
                // no need to do anything.
                return;
            };
            P1.deinit();
            _ = self.map.remove(handle);
        }

        pub fn count(self: P1Lists(T)) usize {
            return self.map.count();
        }
    };
}

const expect = std.testing.expect;

test "creating an object and storing it" {
    var p1lists = P1Lists(i32).init(std.testing.allocator);
    defer p1lists.deinit();
    try expect(p1lists.count() == 0);
}
