// see https://gmplib.org/manual/Custom-Allocation

const std = @import("std");
const page_allocator = std.heap.page_allocator;
const gmp = @cImport(@cInclude("mpir.h"));

pub fn init() void {
    gmp.mp_set_memory_functions(gmp_alloc, gmp_realloc, gmp_free);
}

//const stdout = std.io.getStdOut().writer();

export fn gmp_alloc(n: usize) ?*c_void {
    // std.debug.print("allocating n = {} bytes\n", .{n});
    const t = page_allocator.alloc(u8, n) catch |err|
        {
        std.debug.print("failed to alloc -- {}", .{err});
        unreachable;
    };
    //std.debug.print("successfully got memory t={*}\n", .{t});
    return t.ptr;
}

export fn gmp_free(ptr: ?*c_void, n: usize) void {
    //std.debug.print("free ptr={*} and {} bytes\n", .{ ptr, n });
    // This is how to turn void* from c into a **slice** of memory that
    // knows about its length!  Yes, this took me a long time to figure out.
    const p = @ptrCast([*]u8, ptr)[0..n];
    page_allocator.free(p);
}

export fn gmp_realloc(ptr: ?*c_void, n: usize, m: usize) ?*c_void {
    //std.debug.print("realloc n={},m={} bytes at ptr={*}\n", .{ n, m, ptr });
    const p = @ptrCast([*]u8, ptr)[0..n];
    const t = page_allocator.realloc(p, m) catch |err|
        {
        std.debug.print("failed to realloc -- {}", .{err});
        unreachable;
    };
    //std.debug.print("successfully got realloc t={*}\n", .{t});
    return t.ptr;
}
