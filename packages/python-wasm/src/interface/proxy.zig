const std = @import("std");
const AutoHashMap = std.AutoHashMap;
const util = @import("./util.zig");
const allocator = @import("./allocator.zig");
extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

// A collection of proxy objects of a given type.
// Assumes that the objects have a deinit function.
// Used to support using our code from Web Assembly.
// The handle assigned to an object is never 0.
pub fn ProxyObjects(comptime T: type) type {
    return struct {
        const Proxy = @This();

        map: AutoHashMap(i32, T),
        nextHandle: i32,

        pub fn init() Proxy {
            var map = AutoHashMap(i32, T).init(allocator.get());
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
            // std.debug.print("Proxy({}).put, handle={}, obj={}\n", .{ T, self.nextHandle, obj });
            try self.map.put(self.nextHandle, obj);
            // std.debug.print("put definitely worked\n", .{});
            // std.debug.print("test get: {}\n", .{self.get(self.nextHandle)});
            return self.nextHandle;
        }

        pub fn get(self: Proxy, handle: i32) ?T {
            // std.debug.print("Proxy({}).get, handle={}, count={}\n", .{ T, handle, self.map.count() });
            return self.map.get(handle);
        }

        pub fn free(self: *Proxy, handle: i32) void {
            // std.debug.print("Proxy({}).free, handle={}\n", .{ T, handle });
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

        // Send JSON stringify representation of the object with
        // given handle to Javascript.  The proxied object
        // must have a jsonStringify method.
        pub fn stringify(self: Proxy, handle: i32) void {
            const obj = self.get(handle) orelse {
                // std.debug.print("Proxy({}).get({}) ERROR\n", .{ T, handle });
                util.throw("stringify -- no object with handle");
                return;
            };
            var out = std.ArrayList(u8).init(self.map.allocator);
            defer out.deinit();
            std.json.stringify(obj, .{}, out.writer()) catch {
                util.throw("error stringifying object");
                return;
            };
            wasmSendString(out.items.ptr, out.items.len);
        }

        // Send string representation to Javascript.  Need
        // not be JSON or otherwise parseable. Should be
        // reasonable to look at.
        pub fn format(self: Proxy, handle: i32) void {
            const obj = self.get(handle) orelse {
                std.debug.print("Proxy({}).get({}) ERROR\n", .{ T, handle });
                util.throw("format -- no object with handle");
                return;
            };
            var out = std.ArrayList(u8).init(self.map.allocator);
            defer out.deinit();
            out.writer().print("{}", .{obj}) catch {
                util.throw("error printing object object");
                return;
            };
            wasmSendString(out.items.ptr, out.items.len);
        }
    };
}


