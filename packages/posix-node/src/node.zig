// Copyright, SageMath, Inc., 2022
// I massively added to and changed this file.
//
// ORIGINAL Copyright
// SPDX-FileCopyrightText: 2021 Coil Technologies, Inc
// SPDX-License-Identifier: Apache-2.0

// I'm halfway through changing a lot of the function names, so there are some major
// inconsistencies right now, e.g., stringFromValue vs valueToString. For this,
// naming groups similar functions by the *start* of their name.
// Also, many of these could take a type as input and be a
// a single function instead of a bunch of them.

// Also, it seems like this should be a big struct with the env as a parameter
// to the constructor.  Then instead of passing the env as the first param,
// you call methods on the struct.

const std = @import("std");
const assert = std.debug.assert;
const c = @import("c.zig");
const stdio = @cImport(@cInclude("stdio.h"));
const util = @import("util.zig");

const RegisterError = error{ CreateError, SetError };

pub fn registerFunction(
    env: c.napi_env,
    exports: c.napi_value,
    comptime name: [:0]const u8,
    comptime function: fn (env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value,
) RegisterError!void {
    var napi_function: c.napi_value = undefined;
    var status = c.napi_create_function(env, null, 0, function, null, &napi_function);
    if (status != c.napi_ok) return RegisterError.CreateError;
    status = c.napi_set_named_property(env, exports, @ptrCast([*c]const u8, name), napi_function);
    if (status != c.napi_ok) return RegisterError.SetError;
}

pub fn throwError(env: c.napi_env, message: [*:0]const u8) void {
    var result = c.napi_throw_error(env, null, message);
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }
}

// throw error with the Error(message).code specified
pub fn throwErrorCode(env: c.napi_env, message: [*:0]const u8, code: [*:0]const u8) void {
    var result = c.napi_throw_error(env, code, message);
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }
}

// throw error with the Error(message).code the string version of a number
// char *itoa(int value, char *string, int radix);
// "buf is as long as 17 bytes"
pub fn throwErrorNumber(env: c.napi_env, message: [*:0]const u8, errcode: i32) void {
    var buf: [17]u8 = undefined;
    _ = stdio.sprintf(&buf, "%d", errcode);
    const result = c.napi_throw_error(env, &buf, message);
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }
}

// Throw error but with code set the errno number.
pub fn throwErrno(env: c.napi_env, message: [*:0]const u8) void {
    var buf: [17]u8 = undefined;
    _ = stdio.sprintf(&buf, "%d", util.getErrno());
    const result = c.napi_throw_error(env, &buf, message);
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }
}

pub fn getArgv(env: c.napi_env, info: c.napi_callback_info, comptime n: usize) ![n]c.napi_value {
    var argv: [n]c.napi_value = undefined;
    var argc: usize = n;
    const status = c.napi_get_cb_info(env, info, &argc, &argv, null, null);
    if (status != c.napi_ok) {
        return throw(env, "failed to parse arguments to function");
    }
    return argv;
}

const NodeError = error{ ExceptionThrown, MemoryError, LoopError };

pub fn throw(env: c.napi_env, comptime message: [:0]const u8) NodeError {
    var result = c.napi_throw_error(env, null, @ptrCast([*c]const u8, message));
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }

    return NodeError.ExceptionThrown;
}

pub fn throwMemoryError(env: c.napi_env) NodeError {
    var result = c.napi_throw_error(env, null, "out of memory");
    switch (result) {
        c.napi_ok, c.napi_pending_exception => {},
        else => unreachable,
    }

    return NodeError.MemoryError;
}

pub fn captureUndefined(env: c.napi_env) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_get_undefined(env, &result) != c.napi_ok) {
        return throw(env, "Failed to capture the value of \"undefined\".");
    }
    return result;
}

pub fn set_instance_data(
    env: c.napi_env,
    data: *anyopaque,
    finalize_callback: fn (env: c.napi_env, data: ?*anyopaque, hint: ?*anyopaque) callconv(.C) void,
) !void {
    if (c.napi_set_instance_data(env, data, finalize_callback, null) != c.napi_ok) {
        return throw(env, "Failed to initialize environment.");
    }
}

pub fn create_external(env: c.napi_env, context: *anyopaque) !c.napi_value {
    var result: c.napi_value = null;
    if (c.napi_create_external(env, context, null, null, &result) != c.napi_ok) {
        return throw(env, "Failed to create external for client context.");
    }
    return result;
}

pub fn value_external(
    env: c.napi_env,
    value: c.napi_value,
    comptime error_message: [:0]const u8,
) !?*anyopaque {
    var result: ?*anyopaque = undefined;
    if (c.napi_get_value_external(env, value, &result) != c.napi_ok) {
        return throw(env, error_message);
    }
    return result;
}

pub const UserData = packed struct {
    env: c.napi_env,
    callback_reference: c.napi_ref,
};

/// This will create a reference in V8 with a ref_count of 1.
/// This reference will be destroyed when we return the server response to JS.
pub fn user_data_from_value(env: c.napi_env, value: c.napi_value) !UserData {
    var callback_type: c.napi_valuetype = undefined;
    if (c.napi_typeof(env, value, &callback_type) != c.napi_ok) {
        return throw(env, "Failed to check callback type.");
    }
    if (callback_type != .napi_function) return throw(env, "Callback must be a Function.");

    var callback_reference: c.napi_ref = undefined;
    if (c.napi_create_reference(env, value, 1, &callback_reference) != c.napi_ok) {
        return throw(env, "Failed to create reference to callback.");
    }

    return UserData{
        .env = env,
        .callback_reference = callback_reference,
    };
}

pub fn globals(env: c.napi_env) !?*anyopaque {
    var data: ?*anyopaque = null;
    if (c.napi_get_instance_data(env, &data) != c.napi_ok) {
        return throw(env, "Failed to decode globals.");
    }

    return data;
}

pub fn slice_from_object(
    env: c.napi_env,
    object: c.napi_value,
    comptime key: [:0]const u8,
) ![]const u8 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, key, &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    return slice_from_value(env, property, key);
}

pub fn slice_from_value(
    env: c.napi_env,
    value: c.napi_value,
    comptime key: [:0]const u8,
) ![]u8 {
    var is_buffer: bool = undefined;
    assert(c.napi_is_buffer(env, value, &is_buffer) == .napi_ok);

    if (!is_buffer) return throw(env, key ++ " must be a buffer");

    var data: ?*anyopaque = null;
    var data_length: usize = undefined;
    assert(c.napi_get_buffer_info(env, value, &data, &data_length) == .napi_ok);

    if (data_length < 1) return throw(env, key ++ " must not be empty");

    return @ptrCast([*]u8, data.?)[0..data_length];
}

pub fn bytes_from_object(
    env: c.napi_env,
    object: c.napi_value,
    comptime length: u8,
    comptime key: [:0]const u8,
) ![length]u8 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, key, &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    const data = try slice_from_value(env, property, key);
    if (data.len != length) {
        return throw(env, key ++ " has incorrect length.");
    }

    // Copy this out of V8 as the underlying data lifetime is not guaranteed.
    var result: [length]u8 = undefined;
    std.mem.copy(u8, result[0..], data[0..]);

    return result;
}

pub fn bytes_from_buffer(
    env: c.napi_env,
    buffer: c.napi_value,
    output: []u8,
    comptime key: [:0]const u8,
) !usize {
    const data = try slice_from_value(env, buffer, key);
    if (data.len < 1) {
        return throw(env, key ++ " must not be empty.");
    }
    if (data.len > output.len) {
        return throw(env, key ++ " exceeds max message size.");
    }

    // Copy this out of V8 as the underlying data lifetime is not guaranteed.
    std.mem.copy(u8, output[0..], data[0..]);

    return data.len;
}

pub fn u128_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !u128 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, key, &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    return u128_from_value(env, property, key);
}

pub fn u64_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !u64 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, key, &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    return u64_from_value(env, property, key);
}

pub fn u32_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !u32 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, key, &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    return u32FromValue(env, property, key);
}

pub fn i32_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !i32 {
    var property: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, @ptrCast([*c]const u8, key), &property) != c.napi_ok) {
        return throw(env, key ++ " must be defined");
    }

    return i32FromValue(env, property, key);
}

pub fn u16_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !u16 {
    const result = try u32_from_object(env, object, key);
    if (result > std.math.maxInt(u16)) {
        return throw(env, key ++ " must be a u16.");
    }

    return @intCast(u16, result);
}

pub fn i16_from_object(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8) !i16 {
    const result = try i32_from_object(env, object, key);
    if (result > std.math.maxInt(i16) or result < std.math.minInt(i16)) {
        return throw(env, key ++ " must be a i16.");
    }

    return @intCast(i16, result);
}

pub fn u128_from_value(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !u128 {
    // A BigInt's value (using ^ to mean exponent) is (words[0] * (2^64)^0 + words[1] * (2^64)^1 + ...)

    // V8 says that the words are little endian. If we were on a big endian machine
    // we would need to convert, but big endian is not supported by tigerbeetle.
    var result: u128 = 0;
    var sign_bit: c_int = undefined;
    const words = @ptrCast(*[2]u64, &result);
    var word_count: usize = 2;
    switch (c.napi_get_value_bigint_words(env, value, &sign_bit, &word_count, words)) {
        .napi_ok => {},
        .napi_bigint_expected => return throw(env, name ++ " must be a BigInt"),
        else => unreachable,
    }
    if (sign_bit != 0) return throw(env, name ++ " must be positive");
    if (word_count > 2) return throw(env, name ++ " must fit in 128 bits");

    return result;
}

pub fn u64_from_value(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !u64 {
    var result: u64 = undefined;
    var lossless: bool = undefined;
    switch (c.napi_get_value_bigint_uint64(env, value, &result, &lossless)) {
        .napi_ok => {},
        .napi_bigint_expected => return throw(env, name ++ " must be an unsigned 64-bit BigInt"),
        else => unreachable,
    }
    if (!lossless) return throw(env, name ++ " conversion was lossy");

    return result;
}

pub fn u32FromValue(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !u32 {
    var result: u32 = undefined;
    // TODO Check whether this will coerce signed numbers to a u32:
    // In that case we need to use the appropriate napi method to do more type checking here.
    // We want to make sure this is: unsigned, and an integer.
    switch (c.napi_get_value_uint32(env, value, &result)) {
        c.napi_ok => {},
        c.napi_number_expected => return throw(env, name ++ " must be a number"),
        else => unreachable,
    }
    return result;
}

pub fn i32FromValue(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !i32 {
    var result: i32 = undefined;
    switch (c.napi_get_value_int32(env, value, &result)) {
        c.napi_ok => {},
        c.napi_number_expected => return throw(env, name ++ " must be a number"),
        else => unreachable,
    }
    return result;
}

pub fn valueToBool(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !bool {
    var result: bool = undefined;
    switch (c.napi_get_value_bool(env, value, &result)) {
        c.napi_ok => {},
        c.napi_boolean_expected => return throw(env, name ++ " must be bool"),
        else => unreachable,
    }
    return result;
}

pub fn i64FromBigIntValue(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) !i64 {
    var result: i64 = undefined;
    var lossless: bool = undefined;
    switch (c.napi_get_value_bigint_int64(env, value, &result, &lossless)) {
        c.napi_ok => {},
        c.napi_number_expected => return throw(env, name ++ " must be a BigInt"),
        else => unreachable,
    }
    return result;
}

pub fn stringFromValue(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8, comptime bufsize: usize, buf: *[bufsize]u8) !void {
    var result: usize = undefined;
    if (c.napi_get_value_string_utf8(env, value, buf, bufsize, &result) != c.napi_ok) {
        return throw(env, name ++ " must be a string");
    }
}

// node value --> C char *
// convert a node value to a null terminated C string.  caller must free this using std.c.free.
pub fn valueToString(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) ![*:0]u8 {
    var len: usize = undefined;
    if (c.napi_get_value_string_utf8(env, value, null, 0, &len) != c.napi_ok) {
        return throw(env, name ++ " must be a string");
    }
    var memory = std.c.malloc(len + 1) orelse {
        return throwMemoryError(env);
    };
    var buf = @ptrCast([*:0]u8, memory);
    var result: usize = undefined;
    if (c.napi_get_value_string_utf8(env, value, buf, len + 1, &result) != c.napi_ok) {
        return throw(env, name ++ " must be a string");
    }
    return buf;
}

// node value --> C char *const argv[]
// convert a node value to a null terminated array of null terminated C strings.
// caller must free this using std.c.free; there is a function freeArrayOfStrings
// in util.zig that does this:
pub fn valueToArrayOfStrings(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8) ![*](?[*:0]u8) {
    var len: u32 = undefined;
    if (c.napi_get_array_length(env, value, &len) != c.napi_ok) {
        return throw(env, name ++ " must be array of strings (failed to get length)");
    }
    var memory = std.c.malloc(@sizeOf(?[*:0]u8) * (len + 1)) orelse {
        return throwMemoryError(env);
    };
    var aligned = @alignCast(std.meta.alignment([*](?[*:0]u8)), memory);
    var s: [*](?[*:0]u8) = @ptrCast([*](?[*:0]u8), aligned);
    s[len] = null;
    var i: u32 = 0;
    while (i < len) : (i += 1) {
        var result: c.napi_value = undefined;
        if (c.napi_get_element(env, value, i, &result) != c.napi_ok) {
            return throw(env, name ++ " must be array of strings (failed to get element)");
        }
        s[i] = try valueToString(env, result, name);
    }
    return s;
}

pub fn valueToArrayOfI32(env: c.napi_env, value: c.napi_value, comptime name: [:0]const u8, lenPtr: *u32) ![*]i32 {
    if (c.napi_get_array_length(env, value, lenPtr) != c.napi_ok) {
        return throw(env, name ++ " must be array of ints (failed to get length)");
    }
    var memory = std.c.malloc(@sizeOf(i32) * lenPtr.*) orelse {
        return throwMemoryError(env);
    };
    var aligned = @alignCast(std.meta.alignment([*]i32), memory);
    var s: [*]i32 = @ptrCast([*]i32, aligned);
    var i: u32 = 0;
    while (i < lenPtr.*) : (i += 1) {
        var result: c.napi_value = undefined;
        if (c.napi_get_element(env, value, i, &result) != c.napi_ok) {
            return throw(env, name ++ " must be array of ints (failed to get element)");
        }
        s[i] = try i32FromValue(env, result, "element of array of ints");
    }
    return s;
}

pub fn set_named_property_to_byte_slice(
    env: c.napi_env,
    object: c.napi_value,
    comptime key: [:0]const u8,
    value: []const u8,
    comptime error_message: [:0]const u8,
) !void {
    var result: c.napi_value = undefined;
    // create a copy that is managed by V8.
    if (c.napi_create_buffer_copy(env, value.len, value.ptr, null, &result) != c.napi_ok) {
        return throw(env, error_message ++ " Failed to allocate Buffer in V8.");
    }

    if (c.napi_set_named_property(env, object, key, result) != c.napi_ok) {
        return throw(env, error_message);
    }
}

pub fn set_named_property_to_u128(
    env: c.napi_env,
    object: c.napi_value,
    comptime key: [:0]const u8,
    value: u128,
    comptime error_message: [:0]const u8,
) !void {
    // A BigInt's value (using ^ to mean exponent) is (words[0] * (2^64)^0 + words[1] * (2^64)^1 + ...)

    // V8 says that the words are little endian. If we were on a big endian machine
    // we would need to convert, but big endian is not supported by tigerbeetle.
    var bigint: c.napi_value = undefined;
    if (c.napi_create_bigint_words(
        env,
        0,
        2,
        @ptrCast(*const [2]u64, &value),
        &bigint,
    ) != c.napi_ok) {
        return throw(env, error_message);
    }

    if (c.napi_set_named_property(env, object, key, bigint) != c.napi_ok) {
        return throw(env, error_message);
    }
}

pub fn set_named_property_to_u64(
    env: c.napi_env,
    object: c.napi_value,
    comptime key: [:0]const u8,
    value: u64,
    comptime error_message: [:0]const u8,
) !void {
    var result: c.napi_value = undefined;
    if (c.napi_create_bigint_uint64(env, value, &result) != c.napi_ok) {
        return throw(env, error_message);
    }

    if (c.napi_set_named_property(env, object, key, result) != c.napi_ok) {
        return throw(env, error_message);
    }
}

pub fn set_named_property_to_u32(
    env: c.napi_env,
    object: c.napi_value,
    comptime key: [:0]const u8,
    value: u32,
    comptime error_message: [:0]const u8,
) !void {
    var result: c.napi_value = undefined;
    if (c.napi_create_uint32(env, value, &result) != c.napi_ok) {
        return throw(env, error_message);
    }

    if (c.napi_set_named_property(env, object, key, result) != c.napi_ok) {
        return throw(env, error_message);
    }
}

pub fn setNamedProperty(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8, value: c.napi_value, comptime error_message: [:0]const u8) !void {
    if (c.napi_set_named_property(env, object, @ptrCast([*c]const u8, key), value) != c.napi_ok) {
        return throw(env, "error setting " ++ key ++ " " ++ error_message);
    }
}

pub fn createObject(env: c.napi_env, comptime error_message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_create_object(env, &result) != c.napi_ok) {
        return throw(env, error_message);
    }
    return result;
}

pub fn create_string(env: c.napi_env, value: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_create_string_utf8(env, value, value.len, &result) != c.napi_ok) {
        return throw(env, "error creating string from pointer");
    }
    return result;
}

pub fn strlen(s: [*:0]const u8) usize {
    var i: usize = 0;
    while (s[i] != 0) : (i += 1) {}
    return i;
}

// create nodejs string from null-terminated pointer
pub fn createStringFromPtr(env: c.napi_env, value: ?[*:0]const u8, comptime error_message: [:0]const u8) !c.napi_value {
    const value1 = value orelse {
        return throw(env, "can't create string from null pointer " ++ error_message);
    };
    var result: c.napi_value = undefined;
    if (c.napi_create_string_utf8(env, value1, strlen(value1), &result) != c.napi_ok) {
        return throw(env, "error creating string from pointer " ++ error_message);
    }
    return result;
}

pub fn create_u32(env: c.napi_env, value: u32, comptime error_message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_create_uint32(env, value, &result) != c.napi_ok) {
        return throw(env, "error creating u32 " ++ error_message);
    }
    return result;
}

pub fn create_i32(env: c.napi_env, value: i32, comptime error_message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_create_int32(env, value, &result) != c.napi_ok) {
        return throw(env, "error creating i32 " ++ error_message);
    }
    return result;
}

// this really gets the singleton; it doesn't actually create one.
pub fn create_bool(env: c.napi_env, value: bool, comptime error_message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_get_boolean(env, value, &result) != c.napi_ok) {
        return throw(env, "error creating boolean " ++ error_message);
    }
    return result;
}

pub fn createBuffer(
    env: c.napi_env,
    value: []const u8,
    comptime error_message: [:0]const u8,
) !c.napi_value {
    var data: ?*anyopaque = undefined;
    var result: c.napi_value = undefined;
    if (c.napi_create_buffer(env, value.len, &data, &result) != c.napi_ok) {
        return throw(env, "error creating buffer " ++ error_message);
    }

    std.mem.copy(u8, @ptrCast([*]u8, data.?)[0..value.len], value[0..value.len]);

    return result;
}

pub fn createArray(
    env: c.napi_env,
    length: u32,
    comptime error_message: [:0]const u8,
) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_create_array_with_length(env, length, &result) != c.napi_ok) {
        return throw(env, "error creating array " ++ error_message);
    }

    return result;
}

pub fn setElement(
    env: c.napi_env,
    array: c.napi_value,
    index: u32,
    value: c.napi_value,
    comptime error_message: [:0]const u8,
) !void {
    if (c.napi_set_element(env, array, index, value) != c.napi_ok) {
        return throw(env, error_message);
    }
}

pub fn getArrayElement(env: c.napi_env, array: c.napi_value, index: u32, comptime message: [:0]const u8) !c.napi_value {
    var element: c.napi_value = undefined;
    if (c.napi_get_element(env, array, index, &element) != c.napi_ok) {
        return throw(env, "failed to get array element " ++ message);
    }

    return element;
}

pub fn arrayLength(env: c.napi_env, array: c.napi_value, comptime message: [:0]const u8) !u32 {
    var is_array: bool = undefined;
    if (c.napi_is_array(env, array, &is_array) != c.napi_ok) {
        return throw(env, "error determining if it is an array " ++ message);
    }
    if (!is_array) {
        return throw(env, "must be an array " ++ message);
    }

    var length: u32 = undefined;
    if (c.napi_get_array_length(env, array, &length) != c.napi_ok) {
        return throw(env, "failed to get array length " ++ message);
    }

    return length;
}

pub fn delete_reference(env: c.napi_env, reference: c.napi_ref) !void {
    if (c.napi_delete_reference(env, reference) != c.napi_ok) {
        return throw(env, "Failed to delete callback reference.");
    }
}

pub fn create_error(
    env: c.napi_env,
    comptime message: [:0]const u8,
) NodeError!c.napi_value {
    var napi_string: c.napi_value = undefined;
    if (c.napi_create_string_utf8(env, message, std.mem.len(message), &napi_string) != c.napi_ok) {
        return NodeError.ExceptionThrown;
    }

    var napi_error: c.napi_value = undefined;
    if (c.napi_create_error(env, null, napi_string, &napi_error) != c.napi_ok) {
        return NodeError.ExceptionThrown;
    }

    return napi_error;
}

pub fn call_function(
    env: c.napi_env,
    this: c.napi_value,
    callback: c.napi_value,
    argc: usize,
    argv: [*]c.napi_value,
) !void {
    const result = c.napi_call_function(env, this, callback, argc, argv, null);
    switch (result) {
        .napi_ok => {},
        // the user's callback may throw a JS exception or call other functions that do so. We
        // therefore don't throw another error.
        .napi_pending_exception => {},
        else => return throw(env, "Failed to invoke results callback."),
    }
}

pub fn scope(env: c.napi_env, comptime error_message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_get_global(env, &result) != c.napi_ok) {
        return throw(env, error_message);
    }

    return result;
}

pub fn reference_value(
    env: c.napi_env,
    callback_reference: c.napi_ref,
    comptime error_message: [:0]const u8,
) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_get_reference_value(env, callback_reference, &result) != c.napi_ok) {
        return throw(env, error_message);
    }

    return result;
}

// get file descriptors of the streams
//    process.stdin._handle.fd
pub fn getStreamFd(env: c.napi_env, comptime name: [:0]const u8) !c_int {
    var global: c.napi_value = undefined;
    if (c.napi_get_global(env, &global) != c.napi_ok) {
        return throw(env, "failed to get global");
    }
    var process: c.napi_value = undefined;
    if (c.napi_get_named_property(env, global, "process", &process) != c.napi_ok) {
        return throw(env, name ++ " - failed to get process");
    }
    var stream: c.napi_value = undefined;
    if (c.napi_get_named_property(env, process, @ptrCast([*c]const u8, name), &stream) != c.napi_ok) {
        return throw(env, name ++ " - failed to get stream");
    }
    var _handle: c.napi_value = undefined;
    if (c.napi_get_named_property(env, stream, "_handle", &_handle) != c.napi_ok) {
        return throw(env, name ++ " - failed to get _handle");
    }
    var fd: c.napi_value = undefined;
    if (c.napi_get_named_property(env, _handle, "fd", &fd) != c.napi_ok) {
        return throw(env, name ++ " - failed to get fd");
    }
    return try i32FromValue(env, fd, "process." ++ name ++ "._handle.fd");
}

pub fn getNamedProperty(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8, comptime message: [:0]const u8) !c.napi_value {
    var result: c.napi_value = undefined;
    if (c.napi_get_named_property(env, object, @ptrCast([*c]const u8, key), &result) != c.napi_ok) {
        return throw(env, "getNamedProperty " ++ key ++ " failed -- " ++ message);
    }
    return result;
}

pub fn hasNamedProperty(env: c.napi_env, object: c.napi_value, comptime key: [:0]const u8, comptime message: [:0]const u8) !bool {
    var result: bool = undefined;
    if (c.napi_has_named_property(env, object, @ptrCast([*c]const u8, key), &result) != c.napi_ok) {
        return throw(env, "hasOwnProperty " ++ key ++ " failed -- " ++ message);
    }
    return result;
}

extern fn uv_loop_close(loop: *c.uv_loop_s) void;
pub fn closeEventLoop(env: c.napi_env) !void {
    //std.debug.print("closeEventLoop\n", .{});
    var loop: *c.uv_loop_s = undefined;
    if (c.napi_get_uv_event_loop(env, @ptrCast([*c]?*c.uv_loop_s, &loop)) != c.napi_ok) {
        std.debug.print("failed to close event loop\n", .{});
        return throw(env, "failed to close event loop");
    }
    uv_loop_close(loop);
    //c.free(loop);
}
