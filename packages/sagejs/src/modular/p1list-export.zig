const p1list = @import("./p1list.zig");
const std = @import("std");
const P1Lists = @import("./p1list-container.zig").P1Lists;

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

extern fn reportError(ptr: [*]const u8, len: usize) void;

fn sendError(s: [*]const u8) void {
    var i: usize = 0;
    while (s[i] != 0) : (i += 1) {}
    reportError(s, i);
}

fn P1ListT(comptime T: type, N: i32) !p1list.P1ListType(T) {
    return p1list.P1List(@intCast(T, N), &gpa.allocator);
}

// pub export fn P1List(N: i32) i32 {
//     if (N <= 127) { // 2^7 - 1
//         return P1ListT(i16, N);
//     } else if (N <= 46340) { // 2^15 - 1
//         return P1ListT(i32, N);
//     } else if (N <= 2147483647) { // 2^31 - 1
//         return P1ListT(i64, N);
//     } else {
//         sendError("N is too large");
//         return -1;
//     }
// }

var p1lists32 = P1Lists(i32).init(std.heap.page_allocator);

pub export fn P1List(N: i32) i32 {
    var P1 = P1ListT(i32, N) catch {
        sendError("P1List: failed to create P1ListT");
        return -1;
    };
    return p1lists32.put(P1) catch {
        sendError("P1List: failed to store P1 in map");
        return -1;
    };
}

pub export fn P1List_count(handle: i32) i32 {
    const P1 = p1lists32.get(handle) orelse {
        sendError("P1List_count: failed to get P1 with given handle");
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
        sendError("P1List_normalize: failed to get P1 with given handle");
        return;
    };
    const elt = P1.normalize(u, v) catch {
        sendError("P1List_normalize: failed to normalize");
        return;
    };
    P1List_normalize_cb(elt.u, elt.v);
}

extern fn P1List_normalize_with_scalar_cb(u: i32, v: i32, s: i32) void;
pub export fn P1List_normalize_with_scalar(handle: i32, u: i32, v: i32) void {
    const P1 = p1lists32.get(handle) orelse {
        sendError("P1List_normalize_with_scalar: failed to get P1 with given handle");
        return;
    };
    const z = P1.normalizeWithScalar(u, v) catch {
        sendError("P1List_normalize_with_scalar: failed to normalize");
        return;
    };
    P1List_normalize_with_scalar_cb(z.u, z.v, z.s);
}

pub export fn P1List_index(handle: i32, u: i32, v: i32) i32 {
    const P1 = p1lists32.get(handle) orelse {
        sendError("P1List_index: failed to get P1 with given handle");
        return -1;
    };
    const i = P1.index(u, v) catch {
        sendError("P1List_index: failed to normalize and determine index of (u,v); is this element valid?");
        return -1;
    };
    return @intCast(i32, i); // TODO -- need error catching cast..
}

// const expect = std.testing.expect;

// test "creating an object and storing it" {
//     var handle = P1List(5077);
//     try expect(P1List_len(handle) == 5078);
// }

pub export fn sparseMatrixBench(N: i32) void {
    @import("./sparse-matrix.zig").bench(N) catch {
        sendError("failed");
    };
}
