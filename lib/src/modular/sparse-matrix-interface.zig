const std = @import("std");
const interface = @import("../interface.zig");
const sparse_matrix = @import("./sparse-matrix.zig");
const sparse_vector_interface = @import("./sparse-vector-interface.zig");
const errors = @import("../errors.zig");

const SparseMatrixType = sparse_matrix.SparseMatrixMod(i32);
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var SparseMatrix_objects = interface.ProxyObjects(SparseMatrixType).init(&gpa.allocator);

pub export fn SparseMatrix_free(handle: i32) void {
    SparseMatrix_objects.free(handle);
}

pub fn SparseMatrix_get(handle: i32) !SparseMatrixType {
    return SparseMatrix_objects.get(handle) orelse {
        interface.throw("SparseMatrix: failed to get SparseMatrix with given handle");
        return errors.General.RuntimeError;
    };
}

pub fn SparseMatrix_put(v: SparseMatrixType) i32 {
    return SparseMatrix_objects.put(v) catch {
        interface.throw("SparseMatrix: failed to store");
        return 0;
    };
}

pub export fn SparseMatrix_stringify(handle: i32) void {
    SparseMatrix_objects.stringify(handle);
}

pub export fn SparseMatrix_format(handle: i32) void {
    SparseMatrix_objects.format(handle);
}

pub export fn SparseMatrix_getRow(handle: i32, row: i32) i32 {
    const x = SparseMatrix_get(handle) catch {
        return 0;
    };
    var v = x.getRow(@intCast(usize, row)) catch {
        interface.throw("SparseMatrix: failed to allocate space for row");
        return 0;
    };
    return sparse_vector_interface.SparseVector_put(v);
}
