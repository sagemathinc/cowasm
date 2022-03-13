const std = @import("std");
const interface = @import("../interface.zig");
const dense_matrix = @import("./dense-matrix.zig");
const dense_vector_interface = @import("./dense-vector-interface.zig");
const errors = @import("../errors.zig");
const pari = @import("../pari/pari.zig");

const DenseMatrixType = dense_matrix.DenseMatrixMod(i32);
var DenseMatrix_objects = interface.ProxyObjects(DenseMatrixType).init();

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

pub export fn DenseMatrix_modulus(handle: i32) i32 {
    const x = DenseMatrix_get(handle) catch {
        return 0;
    };
    return x.modulus;
}

pub export fn DenseMatrix_kernel(handle: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    var K = A.kernel() catch {
        interface.throw("DenseMatrix: failed to allocate space for kernel");
        return 0;
    };
    return DenseMatrix_put(K);
}

pub export fn DenseMatrix_subtractScalar(handle: i32, scalar: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    var A_minus_scalar = A.subtractScalar(scalar) catch {
        interface.throw("DenseMatrix: failed to subtract scalar");
        return 0;
    };
    return DenseMatrix_put(A_minus_scalar);
}

pub export fn DenseMatrix_transpose(handle: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    var T = A.transpose() catch {
        interface.throw("DenseMatrix: failed to transpose");
        return 0;
    };
    return DenseMatrix_put(T);
}

pub export fn DenseMatrix_nrows(handle: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    return @intCast(i32, A.nrows);
}

pub export fn DenseMatrix_ncols(handle: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    return @intCast(i32, A.ncols);
}

pub export fn DenseMatrix_rank(handle: i32) i32 {
    const A = DenseMatrix_get(handle) catch {
        return 0;
    };
    // cast is from usize, but due to memory size rank can't possibly lead to overflow.
    return @intCast(i32, A.rank());
}
