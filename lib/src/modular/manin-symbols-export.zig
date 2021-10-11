const std = @import("std");
const manin_symbols = @import("./manin-symbols.zig");
const errors = @import("../errors.zig");
const interface = @import("../interface.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

const T = manin_symbols.ManinSymbols(i32, u32);

fn toSign(sign: i32) !manin_symbols.Sign {
    if (sign == -1) return manin_symbols.Sign.minus;
    if (sign == 1) return manin_symbols.Sign.plus;
    if (sign == 0) return manin_symbols.Sign.zero;
    interface.throw("invalid sign");
    return errors.Math.ValueError;
}

fn createManinSymbols(N: u32, sign: i32) !T {
    return try T.init(&gpa.allocator, N, try toSign(sign));
}

var objects = interface.ProxyObjects(T).init(&gpa.allocator);

pub export fn ManinSymbols(N: i32, sign: i32) i32 {
    if (N <= 0) {
        interface.throw("ManinSymbols: N must be positive");
        return 0;
    }
    var M = createManinSymbols(@intCast(u32, N), sign) catch {
        interface.throw("ManinSymbols: failed to create ManinSymbols");
        return 0;
    };

    return objects.put(M) catch {
        interface.throw("ManinSymbols: failed to store");
        return 0;
    };
}

pub export fn ManinSymbols_free(handle: i32) void {
    objects.free(handle);
}

pub export fn dimensionFormula(handle: i32) i32 {
    var M = objects.get(handle) orelse {
        interface.throw("ManinSymbols: failed to get space with given handle");
        return 0;
    };
    // TODO: could overflow.
    return @intCast(i32, M.dimensionFormula());
}
