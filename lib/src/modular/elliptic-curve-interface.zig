const std = @import("std");
const interface = @import("../interface.zig");
const errors = @import("../errors.zig");
const elliptic_curve = @import("./elliptic-curve.zig");
extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

// This is JUST elliptic curves with i32 coefficients here.  But we will later have others...

const EllipticCurveType = elliptic_curve.EllipticCurve(i32);
var EllipticCurve_objects = interface.ProxyObjects(EllipticCurveType).init();

pub export fn EllipticCurve_init(a1: i32, a2: i32, a3: i32, a4: i32, a6: i32) i32 {
    var E = EllipticCurveType.init(a1, a2, a3, a4, a6, interface.allocator()) catch {
        interface.throw("EllipticCurve: failed to store");
        return 0;
    };
    return EllipticCurve_put(E);
}

pub export fn EllipticCurve_free(handle: i32) void {
    EllipticCurve_objects.free(handle);
}

pub fn EllipticCurve_get(handle: i32) !EllipticCurveType {
    return EllipticCurve_objects.get(handle) orelse {
        interface.throw("EllipticCurve: failed to get EllipticCurve with given handle");
        return errors.General.RuntimeError;
    };
}

pub fn EllipticCurve_put(v: EllipticCurveType) i32 {
    return EllipticCurve_objects.put(v) catch {
        interface.throw("EllipticCurve: failed to store");
        return 0;
    };
}

pub export fn EllipticCurve_stringify(handle: i32) void {
    EllipticCurve_objects.stringify(handle);
}

pub export fn EllipticCurve_format(handle: i32) void {
    EllipticCurve_objects.format(handle);
}

pub export fn EllipticCurve_ap(handle: i32, p: i32) i32 {
    const E = EllipticCurve_get(handle) catch {
        return 0;
    };
    return @intCast(i32, E.ap(p));
}

pub export fn EllipticCurve_analyticRank(handle: i32, bitPrecision: i32) i32 {
    const E = EllipticCurve_get(handle) catch {
        return 0;
    };
    return @intCast(i32, E.analyticRank(bitPrecision));
}

pub export fn EllipticCurve_conductor(handle: i32) i32 {
    const E = EllipticCurve_get(handle) catch {
        return 0;
    };
    return @intCast(i32, E.conductor());
}

pub export fn EllipticCurve_anlist(handle: i32, n: i32) void {
    const E = EllipticCurve_get(handle) catch {
        return;
    };
    var v = E.anlist(n) catch {
        interface.throw("EllipticCurve: failed to store");
        return;
    };
    defer v.deinit();
    var out = std.ArrayList(u8).init(EllipticCurve_objects.map.allocator);
    defer out.deinit();
    std.json.stringify(v.items, .{}, out.writer()) catch {
        interface.throw("error stringifying anlist");
        return;
    };
    wasmSendString(out.items.ptr, out.items.len);
}

pub export fn EllipticCurve_aplist(handle: i32, n: i32) void {
    const E = EllipticCurve_get(handle) catch {
        return;
    };
    var v = E.aplist(n) catch {
        interface.throw("EllipticCurve: failed to store");
        return;
    };
    defer v.deinit();
    var out = std.ArrayList(u8).init(EllipticCurve_objects.map.allocator);
    defer out.deinit();
    std.json.stringify(v.items, .{}, out.writer()) catch {
        interface.throw("error stringifying aplist");
        return;
    };
    wasmSendString(out.items.ptr, out.items.len);
}
