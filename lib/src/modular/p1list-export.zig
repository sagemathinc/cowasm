const p1list = @import("./p1list.zig");
const std = @import("std");
const interface = @import("../interface.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

fn P1ListT(comptime T: type, N: i32) !p1list.P1List(T) {
    return p1list.P1List(T).init(&gpa.allocator, N);
}

var p1lists32 = interface.ProxyObjects(p1list.P1List(i32)).init(&gpa.allocator);

pub export fn P1List(N: i32) i32 {
    var P1 = P1ListT(i32, N) catch {
        interface.throw("P1List: failed to create P1ListT");
        return -1;
    };
    return p1lists32.put(P1) catch {
        interface.throw("P1List: failed to store P1 in map");
        return -1;
    };
}

pub export fn P1List_count(handle: i32) i32 {
    const P1 = p1lists32.get(handle) orelse {
        interface.throw("P1List_count: failed to get P1 with given handle");
        return -1;
    };
    return @intCast(i32, P1.count()); // TODO -- need error catching cast..
}

pub export fn P1List_free(handle: i32) void {
    p1lists32.free(handle);
}

extern fn P1List_normalize_cb(u: i32, v: i32) void;
pub export fn P1List_normalize(handle: i32, u: i32, v: i32) void {
    const P1 = p1lists32.get(handle) orelse {
        interface.throw("P1List_normalize: failed to get P1 with given handle");
        return;
    };
    const elt = P1.normalize(u, v) catch {
        interface.throw("P1List_normalize: failed to normalize");
        return;
    };
    P1List_normalize_cb(elt.u, elt.v);
}

extern fn P1List_normalize_with_scalar_cb(u: i32, v: i32, s: i32) void;
pub export fn P1List_normalize_with_scalar(handle: i32, u: i32, v: i32) void {
    const P1 = p1lists32.get(handle) orelse {
        interface.throw("P1List_normalize_with_scalar: failed to get P1 with given handle");
        return;
    };
    const z = P1.normalizeWithScalar(u, v) catch {
        interface.throw("P1List_normalize_with_scalar: failed to normalize");
        return;
    };
    P1List_normalize_with_scalar_cb(z.u, z.v, z.s);
}

pub export fn P1List_index(handle: i32, u: i32, v: i32) i32 {
    const P1 = p1lists32.get(handle) orelse {
        interface.throw("P1List_index: failed to get P1 with given handle");
        return 0;
    };
    const i = P1.index(u, v) catch {
        interface.throw("P1List_index: failed to normalize and determine index of (u,v); is this element valid?");
        return 0;
    };
    return @intCast(i32, i); // TODO -- need error catching cast..
}

pub export fn sparseMatrixBench(N: i32) void {
    @import("./sparse-matrix.zig").bench(N) catch {
        interface.throw("failed");
    };
}
