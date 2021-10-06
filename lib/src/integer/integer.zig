const gmp = @cImport(@cInclude("gmp.h"));
const std = @import("std");
const ValueError = @import("../errors.zig").Math.ValueError;
const custom_allocator = @import("../custom-allocator.zig");

pub fn IntegerType() type {
    return struct {
        x: gmp.mpz_t,

        pub fn init(self: *IntegerType()) void {
            gmp.mpz_init(&self.x);
        }

        pub fn clear(self: *IntegerType()) void {
            gmp.mpz_clear(&self.x);
        }

        pub fn initSet(self: *IntegerType(), op: anytype) !void {
            const T = @TypeOf(op);
            switch (T) {
                // void mpz_init_set (mpz_t rop, const mpz_t op)
                IntegerType() => gmp.mpz_init_set(&self.x, &op.x),
                // void mpz_init_set_ui (mpz_t rop, unsigned long int op)
                u32, u64 => gmp.mpz_init_set_ui(&self.x, op),
                // void mpz_init_set_si (mpz_t rop, signed long int op)
                i32, i64, comptime_int => gmp.mpz_init_set_si(&self.x, @intCast(c_long, op)),
                else => {
                    std.debug.warn("invalid type {}\n", .{T});
                    return ValueError;
                },
            }
        }

        pub fn initSetStr(self: *IntegerType(), str: [*]const u8, base: c_int) !void {
            if (gmp.mpz_init_set_str(&self.x, str, base) != 0) {
                return ValueError;
            }
        }

        pub fn add(self: *IntegerType(), right: IntegerType()) IntegerType() {
            var c = Integer();
            c.init();
            gmp.mpz_add(&c.x, &self.x, &right.x);
            return c;
        }

        pub fn addInPlace(self: *IntegerType(), right: IntegerType()) void {
            gmp.mpz_add(&self.x, &self.x, &right.x);
        }

        pub fn sub(self: *IntegerType(), right: IntegerType()) IntegerType() {
            var c = Integer();
            c.init();
            gmp.mpz_sub(&c.x, &self.x, &right.x);
            return c;
        }

        pub fn mul(self: *IntegerType(), right: IntegerType()) IntegerType() {
            var c = Integer();
            c.init();
            gmp.mpz_mul(&c.x, &self.x, &right.x);
            return c;
        }

        pub fn pow(self: *IntegerType(), exponent: usize) IntegerType() {
            var c = Integer();
            c.init();
            gmp.mpz_pow_ui(&c.x, &self.x, exponent);
            return c;
        }

        pub fn eql(self: IntegerType(), right: IntegerType()) bool {
            return self.cmp(right) == 0;
        }

        pub fn cmp(self: IntegerType(), right: IntegerType()) c_int {
            return gmp.mpz_cmp(&self.x, &right.x);
        }

        pub fn get_c_long(self: IntegerType()) c_long {
            return gmp.mpz_get_si(&self.x);
        }

        // int mpz_probab_prime_p (const mpz_t n, int reps)
        // "Reasonable values of reps are between 15 and 50."
        // Return 2 if n is definitely prime, return 1 if n is probably prime (without being certain), or return 0 if n is definitely non-prime.
        pub fn primalityTest(self: IntegerType(), reps: c_int) c_int {
            return gmp.mpz_probab_prime_p(&self.x, reps);
        }

        // void mpz_nextprime (mpz_t rop, const mpz_t op)
        pub fn nextPrime(self: IntegerType()) IntegerType() {
            var c = Integer();
            c.init();
            gmp.mpz_nextprime(&c.x, &self.x);
            return c;
        }

        pub fn print(self: IntegerType()) void {
            _ = gmp.gmp_printf("%Zd\n", &self.x);
        }

        pub fn sizeInBase(self: IntegerType(), base: c_int) usize {
            return gmp.mpz_sizeinbase(&self.x, base);
        }

        // Caller must free allocated string using freeString method.
        // TODO: need to check if there was an error.  This will
        // involve implementing an error flag in custom-allocator.zig.
        // Right now, I think program terminates due to the "unreachable" there.
        // "The base argument may vary from 2 to 62 or from -2 to -36."
        pub fn toString(self: IntegerType(), base: c_int) ![]u8 {
            if (base < -36 or base == -1 or base == 0 or base == 1 or base >62) {
                return ValueError;
            }
            var size = self.sizeInBase(base);
            var str = gmp.mpz_get_str(0, base, &self.x);
            if (str[0] == '-') {
                size += 1;
            }
            return str[0..size];
        }

        pub fn freeString(self: IntegerType(), str: []u8) void {
            _ = self;
            custom_allocator.free(str);
        }
    };
}

pub fn Integer() IntegerType() {
    var x: gmp.mpz_t = undefined;
    var n = IntegerType(){ .x = x };
    return n;
}

test "initialize the custom GMP allocator" {
    custom_allocator.init();
}

const expect = std.testing.expect;
test "basic arithmetic" {
    var a = Integer();
    try a.initSetStr("37", 10);
    defer a.clear();

    var b = Integer();
    try b.initSetStr("389", 10);
    defer b.clear();

    var c = a.mul(b);
    defer c.clear();

    try expect(c.get_c_long() == 37 * 389);

    var d = Integer();
    try d.initSet(37 * 389);
    defer d.clear();
    try expect(c.eql(d));
    try expect(a.cmp(c) == -1);
    try expect(d.cmp(c) == 0);
    try expect(c.cmp(a) == 1);
}

test "setting using initSet - int literal" {
    var a = Integer();
    try a.initSet(37);
    defer a.clear();
    try expect(a.get_c_long() == 37);
}

test "setting using initSet - i32" {
    var a = Integer();
    try a.initSet(@as(i32, 37));
    defer a.clear();
    try expect(a.get_c_long() == 37);
}

test "setting using initSet - i64" {
    var a = Integer();
    try a.initSet(@as(i64, 4611686018427387904));
    defer a.clear();
    try expect(a.get_c_long() == 4611686018427387904);
}

test "copying the value from one to another" {
    var a = Integer();
    try a.initSet(200);
    defer a.clear();

    var b = Integer();
    try b.initSet(a);
    defer b.clear();

    try expect(b.get_c_long() == 200);
}

test "primality test -- 389" {
    var a = Integer();
    try a.initSet(389);
    defer a.clear();

    try expect(a.primalityTest(10) == 2);
}

test "primality test -- 2020" {
    var a = Integer();
    try a.initSet(2020);
    defer a.clear();

    try expect(a.primalityTest(10) == 0);
}

test "Use primality test to count primes up to 10000" {
    var i: u32 = 1;
    var s: u32 = 0;
    while (i < 1000) : (i += 1) {
        var a = Integer();
        try a.initSet(i);
        defer a.clear();
        if (a.primalityTest(15) == 2) {
            s += 1;
        }
    }
    try expect(s == 168);
}

test "The nextPrime method" {
    var a = Integer();
    try a.initSet(97);
    defer a.clear();
    var b = a.nextPrime();
    defer b.clear();
    try expect(b.get_c_long() == 101);
}

test "getting the size of an integer" {
    var a = Integer();
    try a.initSetStr("123456", 10);
    defer a.clear();
    try expect(a.sizeInBase(10) == 6);

    var b = Integer();
    try b.initSetStr("-123456", 10);
    defer b.clear();
    try expect(b.sizeInBase(10) == 6); // sign NOT included

    // 123456 is 11110001001000000 in binary
    try expect(b.sizeInBase(2) == 17); // sign NOT included
}

test "converting an integer to a string" {
    var a = Integer();
    try a.initSetStr("123456", 10);
    defer a.clear();
    var str = try a.toString(10);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "123456"));
}

test "converting a negative integer to a string" {
    var a = Integer();
    try a.initSetStr("-123456", 10);
    defer a.clear();
    var str = try a.toString(10);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "-123456"));
}

test "converting an integer to a string in base 2" {
    var a = Integer();
    try a.initSetStr("123456", 10);
    defer a.clear();
    var str = try a.toString(2);
    defer a.freeString(str);
    try expect(std.mem.eql(u8, str, "11110001001000000"));
}
