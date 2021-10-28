pub const gmp = @cImport(@cInclude("gmp.h"));
const std = @import("std");
const errors = @import("../errors.zig");
const custom_allocator = @import("../custom-allocator.zig");
const rational = @import("../rational/rational.zig");

pub const Integer = struct {
    x: gmp.mpz_t,

    pub fn init() !Integer {
        var x: gmp.mpz_t = undefined;
        gmp.mpz_init(&x);
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Integer{ .x = x };
    }

    pub fn initSet(op: anytype) !Integer {
        var x: gmp.mpz_t = undefined;
        const T = @TypeOf(op);
        switch (T) {
            gmp.mpz_t => gmp.mpz_init_set(&x, &op),
            // void mpz_init_set (mpz_t rop, const mpz_t op)
            Integer => gmp.mpz_init_set(&x, &op.x),
            // void mpz_init_set_ui (mpz_t rop, unsigned long int op)
            u32, u64 => gmp.mpz_init_set_ui(&x, op),
            // void mpz_init_set_si (mpz_t rop, signed long int op)
            i32, i64, comptime_int => gmp.mpz_init_set_si(&x, @intCast(c_long, op)),
            else => {
                std.debug.warn("invalid type {}\n", .{T});
                return errors.Math.ValueError;
            },
        }
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Integer{ .x = x };
    }

    pub fn initSetStr(str: [*]const u8, base: c_int) !Integer {
        var x: gmp.mpz_t = undefined;
        if (gmp.mpz_init_set_str(&x, str, base) != 0) {
            return errors.Math.ValueError;
        }
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        return Integer{ .x = x };
    }

    pub fn deinit(self: *Integer) void {
        gmp.mpz_clear(&self.x);
    }

    pub fn add(self: Integer, right: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_add(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn addInPlace(self: *Integer, right: Integer) void {
        gmp.mpz_add(&self.x, &self.x, &right.x);
    }

    pub fn sub(self: Integer, right: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_sub(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn mul(self: Integer, right: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_mul(&c.x, &self.x, &right.x);
        return c;
    }

    pub fn div(self: Integer, right: Integer) !rational.Rational {
        var n = try rational.Rational.initSet(self);
        var d = try rational.Rational.initSet(right);
        return try n.div(d);
    }

    pub fn pow(self: Integer, exponent: usize) !Integer {
        var c = try Integer.init();
        gmp.mpz_pow_ui(&c.x, &self.x, exponent);
        return c;
    }

    pub fn eql(self: Integer, right: Integer) bool {
        return self.cmp(right) == 0;
    }

    pub fn cmp(self: Integer, right: Integer) c_int {
        return gmp.mpz_cmp(&self.x, &right.x);
    }

    pub fn get_c_long(self: Integer) c_long {
        return gmp.mpz_get_si(&self.x);
    }

    // int mpz_probab_prime_p (const mpz_t n, int reps)
    // "Reasonable values of reps are between 15 and 50."
    // Return 2 if n is definitely prime, return 1 if n is probably prime (without being certain), or return 0 if n is definitely non-prime.
    pub fn primalityTest(self: Integer, reps: c_int) c_int {
        return gmp.mpz_probab_prime_p(&self.x, reps);
    }

    // void mpz_nextprime (mpz_t rop, const mpz_t op)
    pub fn nextPrime(self: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_nextprime(&c.x, &self.x);
        return c;
    }

    // additive inverse
    pub fn neg(self: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_neg(&c.x, &self.x);
        return c;
    }

    pub fn gcd(self: Integer, right: Integer) !Integer {
        var c = try Integer.init();
        gmp.mpz_gcd(&c.x, &self.x, &right.x);
        return c;
    }

    //     pub fn xgcd(self: Integer, right: Integer) struct { g: Integer, s: Integer, t: Integer } {
    //         // gmp.mpz_extgcd()

    //     }

    pub fn print(self: Integer) void {
        _ = gmp.gmp_printf("%Zd\n", &self.x);
    }

    // NOTE: this is potentially 1 more than the actual number of digits!
    // It's just a fast to compute upper bound.  E.g., for 423 it is 3,
    // but for 523 it is 4!
    pub fn sizeInBaseBound(self: Integer, base: c_int) usize {
        return gmp.mpz_sizeinbase(&self.x, base);
    }

    // Caller must free allocated string using freeString method.
    // TODO: need to check if there was an error.  This will
    // involve implementing an error flag in custom-allocator.zig.
    // Right now, I think program terminates due to the "unreachable" there.
    // "The base argument may vary from 2 to 62 or from -2 to -36."
    pub fn toString(self: Integer, base: c_int) ![]u8 {
        if (base < -36 or base == -1 or base == 0 or base == 1 or base > 62) {
            return errors.Math.ValueError;
        }
        var size = self.sizeInBaseBound(base);
        var str = gmp.mpz_get_str(0, base, &self.x);
        if (custom_allocator.checkError()) {
            return errors.General.MemoryError;
        }
        if (str[0] == '-') {
            size += 1;
        }
        if (str[size - 1] == 0) {
            // From the docs: "The result will be either exact or 1 too big."
            size -= 1;
        }
        return str[0..size];
    }

    pub fn format(self: Integer, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
        _ = fmt;
        _ = options;
        var str = self.toString(10) catch {
            // I don't know how to return an error that doesn't break compiler.
            _ = try writer.write("[OUT OF MEMORY FORMATTING INTEGER]");
            return;
        };
        defer self.freeString(str);
        _ = try writer.write(str);
    }

    pub fn jsonStringify(
        self: Integer,
        options: std.json.StringifyOptions,
        writer: anytype,
    ) !void {
        _ = options;
        var hex = self.toString(16) catch {
            // I don't know how to return an error that doesn't break compiler.
            const obj = .{ .type = "Integer", .err = "ERROR STRINGIFYING INTEGER" };
            try std.json.stringify(obj, options, writer);
            return;
        };
        defer self.freeString(hex);
        const obj = .{ .type = "Integer", .hex = hex };
        try std.json.stringify(obj, options, writer);
    }

    pub fn freeString(self: Integer, str: []u8) void {
        _ = self;
        custom_allocator.free(str);
    }
};

test "initialize the custom GMP allocator" {
    custom_allocator.init();
}

const expect = std.testing.expect;
test "basic arithmetic" {
    var a = try Integer.initSetStr("37", 10);
    defer a.deinit();
    std.debug.print("a = {}\n", .{a});

    var b = try Integer.initSetStr("389", 10);
    defer b.deinit();

    var c = try a.mul(b);
    defer c.deinit();

    try expect(c.get_c_long() == 37 * 389);

    var d = try Integer.initSet(37 * 389);
    defer d.deinit();
    try expect(c.eql(d));
    try expect(a.cmp(c) == -1);
    try expect(d.cmp(c) == 0);
    try expect(c.cmp(a) == 1);
}

test "setting using initSet - int literal" {
    var a = try Integer.initSet(37);
    defer a.deinit();
    try expect(a.get_c_long() == 37);
}

test "setting using initSet - i32" {
    var a = try Integer.initSet(@as(i32, 37));
    defer a.deinit();
    try expect(a.get_c_long() == 37);
}

test "setting using initSet - i64" {
    var a = try Integer.initSet(@as(i64, 4611686018427387904));
    defer a.deinit();
    try expect(a.get_c_long() == 4611686018427387904);
}

test "copying the value from one to another" {
    var a = try Integer.initSet(200);
    defer a.deinit();

    var b = try Integer.initSet(a);
    defer b.deinit();

    try expect(b.get_c_long() == 200);
}

test "primality test -- 389" {
    var a = try Integer.initSet(389);
    defer a.deinit();

    try expect(a.primalityTest(10) == 2);
}

test "primality test -- 2020" {
    var a = try Integer.initSet(2020);
    defer a.deinit();

    try expect(a.primalityTest(10) == 0);
}

test "Use primality test to count primes up to 10000" {
    var i: u32 = 1;
    var s: u32 = 0;
    while (i < 1000) : (i += 1) {
        var a = try Integer.initSet(i);
        defer a.deinit();
        if (a.primalityTest(15) == 2) {
            s += 1;
        }
    }
    try expect(s == 168);
}

test "The nextPrime method" {
    var a = try Integer.initSet(97);
    defer a.deinit();
    var b = try a.nextPrime();
    defer b.deinit();
    try expect(b.get_c_long() == 101);
}

test "getting the size of an integer" {
    var a = try Integer.initSetStr("123456", 10);
    defer a.deinit();
    try expect(a.sizeInBaseBound(10) == 6);
    // WARNING -- it's just a lower bound!
    var a2 = try Integer.initSetStr("623456", 10);
    defer a2.deinit();
    try expect(a2.sizeInBaseBound(10) == 7);

    var b = try Integer.initSetStr("-123456", 10);
    defer b.deinit();
    try expect(b.sizeInBaseBound(10) == 6); // sign NOT included

    // 123456 is 11110001001000000 in binary
    try expect(b.sizeInBaseBound(2) == 17); // sign NOT included
}

test "converting an integer to a string" {
    var a = try Integer.initSetStr("123456", 10);
    defer a.deinit();
    var str = try a.toString(10);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "123456"));
}

test "converting an integer to a string where the bound is not sharp" {
    var a = try Integer.initSetStr("567", 10);
    defer a.deinit();
    try expect(a.sizeInBaseBound(10) == 4); // not 3!
    var str = try a.toString(10);
    defer a.freeString(str);
    std.debug.print("str='{s}', len={}\n", .{ str, str.len });
    try expect(std.mem.eql(u8, str, "567"));
    try expect(str.len == 3);
}

test "converting a negative integer to a string" {
    var a = try Integer.initSetStr("-123456", 10);
    defer a.deinit();
    var str = try a.toString(10);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "-123456"));
}

test "converting an integer to a string in base 2" {
    var a = try Integer.initSetStr("123456", 10);
    defer a.deinit();
    var str = try a.toString(2);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "11110001001000000"));
}

test "divide two integers" {
    var a = try Integer.initSet(-4);
    defer a.deinit();
    var b = try Integer.initSet(6);
    defer b.deinit();
    var c = try a.div(b);
    defer c.deinit();
    var str = try c.toString(10);
    defer c.freeString(str);
    try expect(std.mem.eql(u8, str, "-2/3"));
}
