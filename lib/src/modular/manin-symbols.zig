const std = @import("std");
const twoTerm = @import("./modsym-2term.zig");

pub const Sign = enum(i4) {
    minus = -1,
    zero = 0,
    plus = 1,
};

pub fn ManinSymbols(comptime T: type) type {
    return struct {
        const Syms = @This();

        allocator: *std.mem.Allocator,
        N: usize,
        sign: Sign,

        pub fn init(allocator: *std.mem.Allocator, N: usize, sign: Sign) Syms {
            return Syms{ .N = N, .sign = sign, .allocator = allocator };
        }

        pub fn print(self: Syms) void {
            std.debug.print("ManinSymbols({},N={},sign={})\n", .{ T, self.N, self.sign });
        }

        pub fn deinit(self: *Syms) void {
            // todo
            _ = self;
        }

        pub fn relationsModI(
            self: *Syms,
        ) twoTerm.Relations {
            var rels = twoTerm.Relations.init(self.allocator);
            return rels;
        }

        pub fn relationsModS(self: *Syms) void {
            _ = self;
        }
    };
}

// fn relation_matrix(comptime T : type, syms, mod) xx {}

// Compute quotient of Manin symbols by the S relations.
//pub fn relationsModuloS(comptime T : type, N : usize) x

const test_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "create a few spaces" {
    var M = ManinSymbols(i32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    M.print();
    var M2 = ManinSymbols(i16).init(test_allocator, 15, Sign.plus);
    defer M2.deinit();
    M2.print();
    var M3 = ManinSymbols(i64).init(test_allocator, 234446, Sign.minus);
    defer M3.deinit();
    M3.print();
}

test "compute relationsModI" {
    var M = ManinSymbols(i32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var rels = M.relationsModI();
    defer rels.deinit();
    std.debug.print("\nrels = {}\n\n", .{rels});
}
