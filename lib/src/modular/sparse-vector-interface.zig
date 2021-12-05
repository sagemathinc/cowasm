const std = @import("std");
const interface = @import("../interface.zig");
const sparse_vector = @import("./dense-vector.zig");
const errors = @import("../errors.zig");

const SparseVectorType = sparse_vector.SparseVectorMod(i32);
var SparseVector_objects = interface.ProxyObjects(SparseVectorType).init();

pub export fn SparseVector_free(handle: i32) void {
    SparseVector_objects.free(handle);
}

pub fn SparseVector_get(handle: i32) !SparseVectorType {
    return SparseVector_objects.get(handle) orelse {
        interface.throw("SparseVector: failed to get SparseVector with given handle");
        return errors.General.RuntimeError;
    };
}

pub fn SparseVector_put(v: SparseVectorType) i32 {
    return SparseVector_objects.put(v) catch {
        interface.throw("SparseVector: failed to store");
        return 0;
    };
}

pub export fn SparseVector_stringify(handle: i32) void {
    SparseVector_objects.stringify(handle);
}

pub export fn SparseVector_format(handle: i32) void {
    SparseVector_objects.format(handle);
}
