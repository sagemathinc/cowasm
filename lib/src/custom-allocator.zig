// see https://gmplib.org/manual/Custom-Allocation

const std = @import("std");
const allocator = @import("./interface/allocator.zig");
const gmp = @cImport(@cInclude("gmp.h"));

var initialized = false;
pub fn init() void {
    if (initialized) return;
    //std.debug.print("initializing custom GMP allocator...\n", .{});
    initialized = true;
    gmp.mp_set_memory_functions(gmp_alloc, gmp_realloc, gmp_free);
}

//const stdout = std.io.getStdOut().writer();

var allocError = false;
pub fn checkError() bool {
    if (allocError) {
        allocError = false;
        return true;
    }
    return false;
}

export fn gmp_alloc(n: usize) ?*c_void {
    // std.debug.print("allocating n = {} bytes\n", .{n});
    const t = allocator.get().alloc(u8, n) catch |err|
        {
        std.debug.print("failed to alloc -- {}", .{err});
        allocError = true;
        return null;
    };
    //std.debug.print("successfully got memory t={*}\n", .{t});
    return t.ptr;
}

export fn gmp_free(ptr: ?*c_void, n: usize) void {
    //std.debug.print("free ptr={*} and {} bytes\n", .{ ptr, n });
    // This is how to turn void* from c into a **slice** of memory that
    // knows about its length!  Yes, this took me a long time to figure out.
    const p = @ptrCast([*]u8, ptr)[0..n];
    allocator.get().free(p);
}

pub fn free(slice: []u8) void {
    if (initialized) {
        allocator.get().free(slice);
    } else {
        // still using malloc
        std.c.free(slice.ptr);
    }
}

export fn gmp_realloc(ptr: ?*c_void, n: usize, m: usize) ?*c_void {
    //std.debug.print("realloc n={},m={} bytes at ptr={*}\n", .{ n, m, ptr });
    const p = @ptrCast([*]u8, ptr)[0..n];
    const t = allocator.get().realloc(p, m) catch |err|
        {
        std.debug.print("failed to realloc -- {}", .{err});
        unreachable;
    };
    //std.debug.print("successfully got realloc t={*}\n", .{t});
    return t.ptr;
}
