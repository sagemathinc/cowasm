const std = @import("std");
const interface = @import("../interface.zig");
const dense_vector = @import("./dense-vector.zig");
const errors = @import("../errors.zig");

const DenseVectorType = dense_vector.DenseVectorMod(i32);
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var DenseVector_objects = interface.ProxyObjects(DenseVectorType).init(&gpa.allocator);

pub export fn DenseVector_free(handle: i32) void {
    DenseVector_objects.free(handle);
}

pub fn DenseVector_get(handle: i32) !DenseVectorType {
    return DenseVector_objects.get(handle) orelse {
        interface.throw("DenseVector: failed to get DenseVector with given handle");
        return errors.General.RuntimeError;
    };
}

pub fn DenseVector_put(v: DenseVectorType) i32 {
    return DenseVector_objects.put(v) catch {
        interface.throw("DenseVector: failed to store");
        return 0;
    };
}

pub export fn DenseVector_stringify(handle: i32) void {
    DenseVector_objects.stringify(handle);
}

pub export fn DenseVector_format(handle: i32) void {
    DenseVector_objects.format(handle);
}
