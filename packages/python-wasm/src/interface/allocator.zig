// This is the one allocator we use for the WebAssembly interface.

const std = @import("std");
var gpa = std.heap.GeneralPurposeAllocator(.{}){};

pub fn get() std.mem.Allocator {
    return gpa.allocator();
}
