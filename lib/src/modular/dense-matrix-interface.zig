const std = @import("std");
const interface = @import("../interface.zig");
const dense_matrix = @import("./dense-matrix.zig");
const dense_vector_interface = @import("./dense-vector-interface.zig");
const errors = @import("../errors.zig");

const DenseMatrixType = dense_matrix.DenseMatrixMod(i32);
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var DenseMatrix_objects = interface.ProxyObjects(DenseMatrixType).init(&gpa.allocator);

pub export fn DenseMatrix_free(handle: i32) void {
    DenseMatrix_objects.free(handle);
}

pub fn DenseMatrix_get(handle: i32) !DenseMatrixType {
    return DenseMatrix_objects.get(handle) orelse {
        interface.throw("DenseMatrix: failed to get DenseMatrix with given handle");
        return errors.General.RuntimeError;
    };
}

pub fn DenseMatrix_put(v: DenseMatrixType) i32 {
    return DenseMatrix_objects.put(v) catch {
        interface.throw("DenseMatrix: failed to store");
        return 0;
    };
}

pub export fn DenseMatrix_stringify(handle: i32) void {
    DenseMatrix_objects.stringify(handle);
}

pub export fn DenseMatrix_format(handle: i32) void {
    DenseMatrix_objects.format(handle);
}

pub export fn DenseMatrix_getRow(handle: i32, row: i32) i32 {
    const x = DenseMatrix_get(handle) catch {
        return 0;
    };
    var v = x.getRow(@intCast(usize, row)) catch {
        interface.throw("DenseMatrix: failed to allocate space for row");
        return 0;
    };
    return dense_vector_interface.DenseVector_put(v);
}
