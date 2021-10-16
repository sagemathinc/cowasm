const std = @import("std");
const errors = @import("../errors.zig");
const custom_allocator = @import("../custom-allocator.zig");
const integer = @import("../integer/integer.zig");
const gmp = integer.gmp;
const Integer = integer.Integer;

pub const Rational = struct {
    x: gmp.mpq_t,

    pub fn init() !Rational {
        var x: gmp.mpq_t = undefined;
        gmp.mpq_init(&x);
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Rational{ .x = x };
    }

    pub fn initSet(op: anytype) !Rational {
        var x: gmp.mpq_t = undefined;
        const T = @TypeOf(op);
        switch (T) {
            Integer => {
                gmp.mpz_init_set(gmp.mpq_numref(&x), &op.x);
                gmp.mpz_init_set_si(gmp.mpq_denref(&x), 1);
            },
            Rational => {
                gmp.mpq_init(&x);
                gmp.mpq_set(&x, &op.x);
            },
            // void mpq_init_set_ui (mpq_t rop, unsigned long int op)
            u32, u64 => {
                gmp.mpq_init(&x);
                gmp.mpq_set_ui(&x, op);
            },
            // void mpq_init_set_si (mpq_t rop, signed long int op)
            i32, i64, comptime_int => {
                gmp.mpq_init(&x);
                gmp.mpq_set_si(&x, @intCast(c_long, op));
            },
            else => {
                std.debug.warn("invalid type {}\n", .{T});
                return errors.General.NotImplementedError;
            },
        }
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Rational{ .x = x };
    }

    pub fn initSetStr(str: [*]const u8, base: c_int) !Rational {
        var x: gmp.mpq_t = undefined;
        gmp.mpq_init(&x);
        if (gmp.mpq_set_str(&x, str, base) != 0) {
            return errors.Math.ValueError;
        }
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Rational{ .x = x };
    }

    pub fn deinit(self: *Rational) void {
        gmp.mpq_clear(&self.x);
    }

    pub fn add(self: Rational, right: Rational) !Rational {
        var c = try Rational.init();
        gmp.mpq_add(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn addInPlace(self: *Rational, right: Rational) void {
        gmp.mpq_add(&self.x, &self.x, &right.x);
    }

    pub fn sub(self: Rational, right: Rational) !Rational {
        var c = try Rational.init();
        gmp.mpq_sub(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn mul(self: Rational, right: Rational) !Rational {
        var c = try Rational.init();
        gmp.mpq_mul(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn pow(self: Rational, exponent: usize) !Rational {
        var c = try Rational.init();
        gmp.mpz_pow_ui(gmp.mpq_numref(&c.x), gmp.mpq_numref(&self.x), exponent);
        gmp.mpz_pow_ui(gmp.mpq_denref(&c.x), gmp.mpq_denref(&self.x), exponent);
        return c;
    }

    pub fn eql(self: Rational, right: Rational) bool {
        return self.cmp(right) == 0;
    }

    pub fn cmp(self: Rational, right: Rational) c_int {
        return gmp.mpq_cmp(&self.x, &right.x);
    }

    pub fn numerator(self: Rational) !Integer {
        var num = try Integer.init();
        gmp.mpq_get_num(&num.x, &self.x);
        return num;
    }

    pub fn denominator(self: Rational) !Integer {
        var den = try Integer.init();
        gmp.mpq_get_den(&den.x, &self.x);
        return den;
    }

    pub fn print(self: Rational) void {
        _ = gmp.gmp_printf("%Qd\n", &self.x);
    }

    // Caller must free allocated string using freeString method.
    // TODO: need to check if there was an error.  This will
    // involve implementing an error flag in custom-allocator.zig.
    // Right now, I think program terminates due to the "unreachable" there.
    // "The base argument may vary from 2 to 62 or from -2 to -36."
    pub fn toString(self: Rational, base: c_int) ![]u8 {
        if (base < -36 or base == -1 or base == 0 or base == 1 or base > 62) {
            return errors.Math.ValueError;
        }
        var str = gmp.mpq_get_str(0, base, &self.x);
        const size = std.mem.lenZ(str);
        return str[0..size];
    }

    pub fn freeString(self: Rational, str: []u8) void {
        _ = self; // not used
        custom_allocator.free(str);
    }
};

test "initialize the custom GMP allocator" {
    custom_allocator.init();
}

test "create a rational number" {
    var a = try Rational.initSetStr("-2/3", 10);
    defer a.deinit();
    var s = try a.toString(10);
    defer a.freeString(s);
    try expect(std.mem.eql(u8, s, "-2/3"));
    var n = try a.numerator();
    defer n.deinit();
    try expect(n.get_c_long() == -2);
    var d = try a.denominator();
    defer d.deinit();
    try expect(d.get_c_long() == 3);
}

const expect = std.testing.expect;
