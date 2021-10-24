(function(){
    "use strict";
    var ρσ_iterator_symbol = (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") ? Symbol.iterator : "iterator-Symbol-5d0927e5554349048cf0e3762a228256";
    var ρσ_kwargs_symbol = (typeof Symbol === "function") ? Symbol("kwargs-object") : "kwargs-object-Symbol-5d0927e5554349048cf0e3762a228256";
    var ρσ_cond_temp, ρσ_expr_temp, ρσ_last_exception;
    var ρσ_object_counter = 0;
    if( typeof HTMLCollection !== "undefined" && typeof Symbol === "function") NodeList.prototype[Symbol.iterator] = HTMLCollection.prototype[Symbol.iterator] = NamedNodeMap.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
var ρσ_len;
function abs(a) {
    return (typeof a === 'object' && a.__abs__ !== undefined) ? a.__abs__() : Math.abs(a);
};
abs.__argnames__ = ["a"];
abs.__module__ = "__main__";
undefined;

function ρσ_operator_add(a, b) {
    return (
typeof a !== 'object' ? a + b :
    ((a.__add__ !== undefined ? a.__add__(b) :
      a.concat !== undefined ? a.concat(b) :
      a + b)
    )
);
};
ρσ_operator_add.__argnames__ = ["a", "b"];
ρσ_operator_add.__module__ = "__main__";
undefined;

function ρσ_operator_sub(a, b) {
    return (typeof a === 'object' && a.__sub__ !== undefined) ? a.__sub__(b) : a - b;
};
ρσ_operator_sub.__argnames__ = ["a", "b"];
ρσ_operator_sub.__module__ = "__main__";
undefined;

function ρσ_operator_mul(a, b) {
    return (typeof a === 'object'  && a.__mul__ !== undefined) ? a.__mul__(b) : a * b;
};
ρσ_operator_mul.__argnames__ = ["a", "b"];
ρσ_operator_mul.__module__ = "__main__";
undefined;

function ρσ_operator_div(a, b) {
    return (typeof a === 'object'  && a.__div__ !== undefined) ? a.__div__(b) : a / b;
};
ρσ_operator_div.__argnames__ = ["a", "b"];
ρσ_operator_div.__module__ = "__main__";
undefined;

function ρσ_operator_pow(a, b) {
    return (typeof a === 'object'  && a.__pow__ !== undefined) ? a.__pow__(b) : a ** b;
};
ρσ_operator_pow.__argnames__ = ["a", "b"];
ρσ_operator_pow.__module__ = "__main__";
undefined;

function ρσ_operator_iadd(a, b) {
    return (typeof a === 'object' && a.__iadd__ !== undefined) ? a.__iadd__(b) : ρσ_operator_add(a,b);
};
ρσ_operator_iadd.__argnames__ = ["a", "b"];
ρσ_operator_iadd.__module__ = "__main__";
undefined;

function ρσ_operator_isub(a, b) {
    return (typeof a === 'object' && a.__isub__ !== undefined) ? a.__isub__(b) : ρσ_operator_sub(a,b);
};
ρσ_operator_isub.__argnames__ = ["a", "b"];
ρσ_operator_isub.__module__ = "__main__";
undefined;

function ρσ_operator_imul(a, b) {
    return (typeof a === 'object' && a.__imul__ !== undefined) ? a.__imul__(b) : ρσ_operator_mul(a,b);
};
ρσ_operator_imul.__argnames__ = ["a", "b"];
ρσ_operator_imul.__module__ = "__main__";
undefined;

function ρσ_operator_idiv(a, b) {
    return (typeof a === 'object' && a.__idiv__ !== undefined) ? a.__idiv__(b) : ρσ_operator_div(a,b);
};
ρσ_operator_idiv.__argnames__ = ["a", "b"];
ρσ_operator_idiv.__module__ = "__main__";
undefined;

function ρσ_operator_ipow(a, b) {
    return (typeof a === 'object' && a.__ipow__ !== undefined) ? a.__ipow__(b) : ρσ_operator_pow(a,b);
};
ρσ_operator_ipow.__argnames__ = ["a", "b"];
ρσ_operator_ipow.__module__ = "__main__";
undefined;

function ρσ_operator_truediv(a, b) {
    return (typeof a === 'object'  && a.__truediv__ !== undefined) ? a.__truediv__(b) : a / b;
};
ρσ_operator_truediv.__argnames__ = ["a", "b"];
ρσ_operator_truediv.__module__ = "__main__";
undefined;

function ρσ_operator_floordiv(a, b) {
    return (typeof a === 'object'  && a.__floordiv__ !== undefined) ? a.__floordiv__(b) : Math.floor(a / b);
};
ρσ_operator_floordiv.__argnames__ = ["a", "b"];
ρσ_operator_floordiv.__module__ = "__main__";
undefined;

function ρσ_bool(val) {
    return !!val;
};
ρσ_bool.__argnames__ = ["val"];
ρσ_bool.__module__ = "__main__";
undefined;

function ρσ_round(val) {
    return Math.round(val);
};
ρσ_round.__argnames__ = ["val"];
ρσ_round.__module__ = "__main__";
undefined;

function ρσ_print() {
    var parts;
    if (typeof console === "object") {
        parts = [];
        for (var i = 0; i < arguments.length; i++) {
            parts.push((ρσ_str?.__call__?.bind(ρσ_str) ?? ρσ_str)(arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]));
        }
        console.log(parts.join(" "));
    }
};
ρσ_print.__module__ = "__main__";
undefined;

function ρσ_int(val, base) {
    var ans;
    if (typeof val === "number") {
        ans = val | 0;
    } else {
        ans = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(val, base || 10);
    }
    if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(ans)) {
        throw new ValueError(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("Invalid literal for int with base ", (base || 10)), ": "), val));
    }
    return ans;
};
ρσ_int.__argnames__ = ["val", "base"];
ρσ_int.__module__ = "__main__";
undefined;

function ρσ_float(val) {
    var ans;
    if (typeof val === "number") {
        ans = val;
    } else {
        ans = (parseFloat?.__call__?.bind(parseFloat) ?? parseFloat)(val);
    }
    if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(ans)) {
        throw new ValueError(ρσ_operator_add("Could not convert string to float: ", arguments[0]));
    }
    return ans;
};
ρσ_float.__argnames__ = ["val"];
ρσ_float.__module__ = "__main__";
undefined;

function ρσ_arraylike_creator() {
    var names;
    names = "Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" ");
    if (typeof HTMLCollection === "function") {
        names = names.concat("HTMLCollection NodeList NamedNodeMap TouchList".split(" "));
    }
    return (function() {
        var ρσ_anonfunc = function (x) {
            if (Array.isArray(x) || typeof x === "string" || names.indexOf(Object.prototype.toString.call(x).slice(8, -1)) > -1) {
                return true;
            }
            return false;
        };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
};
ρσ_arraylike_creator.__module__ = "__main__";
undefined;

function options_object(f) {
    return (function() {
        var ρσ_anonfunc = function () {
            if (typeof arguments[arguments.length - 1] === "object") {
                arguments[ρσ_bound_index(ρσ_operator_sub(arguments.length, 1), arguments)][ρσ_kwargs_symbol] = true;
            }
            return f.apply(this, arguments);
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
};
options_object.__argnames__ = ["f"];
options_object.__module__ = "__main__";
undefined;

function ρσ_id(x) {
    return x.ρσ_object_id;
};
ρσ_id.__argnames__ = ["x"];
ρσ_id.__module__ = "__main__";
undefined;

function ρσ_dir(item) {
    var arr;
    arr = ρσ_list_decorate([]);
    for (var i in item) {
        arr.push(i);
    }
    return arr;
};
ρσ_dir.__argnames__ = ["item"];
ρσ_dir.__module__ = "__main__";
undefined;

function ρσ_ord(x) {
    var ans, second;
    ans = x.charCodeAt(0);
    if (55296 <= ans && ans <= 56319) {
        second = x.charCodeAt(1);
        if (56320 <= second && second <= 57343) {
            return ρσ_operator_add(ρσ_operator_sub(ρσ_operator_add(ρσ_operator_mul((ρσ_operator_sub(ans, 55296)), 1024), second), 56320), 65536);
        }
        throw new TypeError("string is missing the low surrogate char");
    }
    return ans;
};
ρσ_ord.__argnames__ = ["x"];
ρσ_ord.__module__ = "__main__";
undefined;

function ρσ_chr(code) {
    if (code <= 65535) {
        return String.fromCharCode(code);
    }
    code = ρσ_operator_isub(code, 65536);
    return String.fromCharCode(ρσ_operator_add(55296, (code >> 10)), ρσ_operator_add(56320, (code & 1023)));
};
ρσ_chr.__argnames__ = ["code"];
ρσ_chr.__module__ = "__main__";
undefined;

function ρσ_callable(x) {
    return typeof x === "function";
};
ρσ_callable.__argnames__ = ["x"];
ρσ_callable.__module__ = "__main__";
undefined;

function ρσ_bin(x) {
    var ans;
    if (typeof x !== "number" || x % 1 !== 0) {
        throw new TypeError("integer required");
    }
    ans = x.toString(2);
    if (ans[0] === "-") {
        ans = ρσ_operator_add(ρσ_operator_add("-", "0b"), ans.slice(1));
    } else {
        ans = ρσ_operator_add("0b", ans);
    }
    return ans;
};
ρσ_bin.__argnames__ = ["x"];
ρσ_bin.__module__ = "__main__";
undefined;

function ρσ_hex(x) {
    var ans;
    if (typeof x !== "number" || x % 1 !== 0) {
        throw new TypeError("integer required");
    }
    ans = x.toString(16);
    if (ans[0] === "-") {
        ans = ρσ_operator_add(ρσ_operator_add("-", "0x"), ans.slice(1));
    } else {
        ans = ρσ_operator_add("0x", ans);
    }
    return ans;
};
ρσ_hex.__argnames__ = ["x"];
ρσ_hex.__module__ = "__main__";
undefined;

function ρσ_enumerate(iterable) {
    var ans, iterator;
    ans = {"_i":-1};
    ans[ρσ_iterator_symbol] = (function() {
        var ρσ_anonfunc = function () {
            return this;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i < iterable.length) {
                    return {'done':false, 'value':[this._i, iterable[this._i]]};
                }
                return {'done':true};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    }
    if (typeof iterable[ρσ_iterator_symbol] === "function") {
        iterator = (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
        ans["_iterator"] = iterator;
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                var r;
                r = this._iterator.next();
                if (r.done) {
                    return {'done':true};
                }
                this._i = ρσ_operator_iadd(this._i, 1);
                return {'done':false, 'value':[this._i, r.value]};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    }
    return (ρσ_enumerate?.__call__?.bind(ρσ_enumerate) ?? ρσ_enumerate)(Object.keys(iterable));
};
ρσ_enumerate.__argnames__ = ["iterable"];
ρσ_enumerate.__module__ = "__main__";
undefined;

function ρσ_reversed(iterable) {
    var ans;
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        ans = {"_i": iterable.length};
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_isub(this._i, 1);
                if (this._i > -1) {
                    return {'done':false, 'value':iterable[this._i]};
                }
                return {'done':true};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    }
    throw new TypeError("reversed() can only be called on arrays or strings");
};
ρσ_reversed.__argnames__ = ["iterable"];
ρσ_reversed.__module__ = "__main__";
undefined;

function ρσ_iter(iterable) {
    var ans;
    if (typeof iterable[ρσ_iterator_symbol] === "function") {
        return (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
    }
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        ans = {"_i":-1};
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i < iterable.length) {
                    return {'done':false, 'value':iterable[this._i]};
                }
                return {'done':true};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    }
    return (ρσ_iter?.__call__?.bind(ρσ_iter) ?? ρσ_iter)(Object.keys(iterable));
};
ρσ_iter.__argnames__ = ["iterable"];
ρσ_iter.__module__ = "__main__";
undefined;

function ρσ_range_next(step, length) {
    var ρσ_unpack;
    this._i = ρσ_operator_iadd(this._i, step);
    this._idx = ρσ_operator_iadd(this._idx, 1);
    if (this._idx >= length) {
        ρσ_unpack = [this.__i, -1];
        this._i = ρσ_unpack[0];
        this._idx = ρσ_unpack[1];
        return {'done':true};
    }
    return {'done':false, 'value':this._i};
};
ρσ_range_next.__argnames__ = ["step", "length"];
ρσ_range_next.__module__ = "__main__";
undefined;

function ρσ_range(start, stop, step) {
    var length, ans;
    if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
    }
    step = arguments[2] || 1;
    length = Math.max(Math.ceil(ρσ_operator_truediv((ρσ_operator_sub(stop, start)), step)), 0);
    ans = {start:start, step:step, stop:stop};
    ans[ρσ_iterator_symbol] = (function() {
        var ρσ_anonfunc = function () {
            var it;
            it = {"_i": start - step, "_idx": -1};
            it.next = ρσ_range_next.bind(it, step, length);
            it[ρσ_iterator_symbol] = (function() {
                var ρσ_anonfunc = function () {
                    return this;
                };
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })();
            return it;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans.count = (function() {
        var ρσ_anonfunc = function (val) {
            if (!this._cached) {
                this._cached = (list?.__call__?.bind(list) ?? list)(this);
            }
            return this._cached.count(val);
        };
ρσ_anonfunc.__argnames__ = ["val"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans.index = (function() {
        var ρσ_anonfunc = function (val) {
            if (!this._cached) {
                this._cached = (list?.__call__?.bind(list) ?? list)(this);
            }
            return this._cached.index(val);
        };
ρσ_anonfunc.__argnames__ = ["val"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    function slice() {
        var new_start = (arguments[0] === undefined || ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? slice.__defaults__.new_start : arguments[0];
        var new_stop = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? slice.__defaults__.new_stop : arguments[1];
        var ρσ_kwargs_obj = arguments[arguments.length-1];
        if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
        if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "new_start")){
            new_start = ρσ_kwargs_obj.new_start;
        }
        if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "new_stop")){
            new_stop = ρσ_kwargs_obj.new_stop;
        }
        if (step < 0) {
            if (new_start === undefined && new_stop === undefined) {
                return ans;
            }
            return (list?.__call__?.bind(list) ?? list)(ans).slice(new_start, new_stop);
        }
        if (new_start === undefined) {
            if (new_stop === undefined) {
                return ans;
            } else {
                if (new_stop < 0) {
                    new_stop = ρσ_operator_add(length, new_stop);
                }
                return (ρσ_range?.__call__?.bind(ρσ_range) ?? ρσ_range)(start, Math.max(start, Math.min(ρσ_operator_add(ρσ_operator_mul(new_stop, step), start), stop)), step);
            }
        }
        if (new_stop === undefined) {
            if (new_start < 0) {
                new_start = ρσ_operator_add(length, new_start);
            }
            return (ρσ_range?.__call__?.bind(ρσ_range) ?? ρσ_range)(Math.min(stop, Math.max(ρσ_operator_add(ρσ_operator_mul(new_start, step), start), start)), stop, step);
        } else {
            if (new_stop < 0) {
                new_stop = ρσ_operator_add(length, new_stop);
            }
            if (new_start < 0) {
                new_start = ρσ_operator_add(length, new_start);
            }
            return (ρσ_range?.__call__?.bind(ρσ_range) ?? ρσ_range)(Math.min(ρσ_operator_mul(new_stop, step), Math.max(ρσ_operator_add(ρσ_operator_mul(new_start, step), start), start)), Math.max(ρσ_operator_add(ρσ_operator_mul(new_start, step), start), Math.min(ρσ_operator_add(ρσ_operator_mul(new_stop, step), start), stop)), step);
        }
    };
slice.__defaults__ = {new_start:undefined, new_stop:undefined};
slice.__handles_kwarg_interpolation__ = true;
slice.__argnames__ = ["new_start", "new_stop"];
slice.__module__ = "__main__";
undefined;

    ans.slice = slice;
    ans.__len__ = (function() {
        var ρσ_anonfunc = function () {
            return length;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans.__repr__ = (function() {
        var ρσ_anonfunc = function () {
            if (ρσ_equals(step, 1)) {
                return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("range(", ρσ_str.format("{}", start)), ", "), ρσ_str.format("{}", stop)), ")");
            } else {
                return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("range(", ρσ_str.format("{}", start)), ", "), ρσ_str.format("{}", stop)), ", "), ρσ_str.format("{}", step)), ")");
            }
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans.__str__ = ans.toString = ans.__repr__;
    if (typeof Proxy === "function") {
        ans = new Proxy(ans, {"get":(function() {
            var ρσ_anonfunc = function (obj, prop) {
                var iprop;
                if (typeof prop === "string") {
                    iprop = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(prop);
                    if (!(isNaN?.__call__?.bind(isNaN) ?? isNaN)(iprop)) {
                        prop = iprop;
                    }
                }
                if (typeof prop === "number") {
                    if (!obj._cached) {
                        obj._cached = (list?.__call__?.bind(list) ?? list)(obj);
                    }
                    return (ρσ_expr_temp = obj._cached)[(typeof prop === "number" && prop < 0) ? ρσ_expr_temp.length + prop : prop];
                }
                return obj[(typeof prop === "number" && prop < 0) ? obj.length + prop : prop];
            };
ρσ_anonfunc.__argnames__ = ["obj", "prop"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })()});
    }
    return ans;
};
ρσ_range.__argnames__ = ["start", "stop", "step"];
ρσ_range.__module__ = "__main__";
undefined;

function ρσ_getattr(obj, name, defval) {
    var ret;
    try {
        ret = obj[(typeof name === "number" && name < 0) ? obj.length + name : name];
    } catch (ρσ_Exception) {
        ρσ_last_exception = ρσ_Exception;
        if (ρσ_Exception instanceof TypeError) {
            if (defval === undefined) {
                throw new AttributeError(ρσ_operator_add(ρσ_operator_add("The attribute ", name), " is not present"));
            }
            return defval;
        } else {
            throw ρσ_Exception;
        }
    }
    if (ret === undefined && !(name in obj)) {
        if (defval === undefined) {
            throw new AttributeError(ρσ_operator_add(ρσ_operator_add("The attribute ", name), " is not present"));
        }
        ret = defval;
    }
    return ret;
};
ρσ_getattr.__argnames__ = ["obj", "name", "defval"];
ρσ_getattr.__module__ = "__main__";
undefined;

function ρσ_setattr(obj, name, value) {
    obj[(typeof name === "number" && name < 0) ? obj.length + name : name] = value;
};
ρσ_setattr.__argnames__ = ["obj", "name", "value"];
ρσ_setattr.__module__ = "__main__";
undefined;

function ρσ_hasattr(obj, name) {
    return name in obj;
};
ρσ_hasattr.__argnames__ = ["obj", "name"];
ρσ_hasattr.__module__ = "__main__";
undefined;

ρσ_len = (function() {
    var ρσ_anonfunc = function () {
        function len(obj) {
            if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(obj)) {
                return obj.length;
            }
            if (typeof obj.__len__ === "function") {
                return obj.__len__();
            }
            if (obj instanceof Set || obj instanceof Map) {
                return obj.size;
            }
            return Object.keys(obj).length;
        };
len.__argnames__ = ["obj"];
len.__module__ = "__main__";
undefined;

        function len5(obj) {
            if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(obj)) {
                return obj.length;
            }
            if (typeof obj.__len__ === "function") {
                return obj.__len__();
            }
            return Object.keys(obj).length;
        };
len5.__argnames__ = ["obj"];
len5.__module__ = "__main__";
undefined;

        return (typeof Set === "function" && typeof Map === "function") ? len : len5;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()();
function ρσ_get_module(name) {
    return ρσ_modules[(typeof name === "number" && name < 0) ? ρσ_modules.length + name : name];
};
ρσ_get_module.__argnames__ = ["name"];
ρσ_get_module.__module__ = "__main__";
undefined;

function ρσ_pow(x, y, z) {
    var ans;
    ans = Math.pow(x, y);
    if (z !== undefined) {
        ans %= z;
    }
    return ans;
};
ρσ_pow.__argnames__ = ["x", "y", "z"];
ρσ_pow.__module__ = "__main__";
undefined;

function ρσ_type(x) {
    return x.constructor;
};
ρσ_type.__argnames__ = ["x"];
ρσ_type.__module__ = "__main__";
undefined;

function ρσ_divmod(x, y) {
    var d;
    if (y === 0) {
        throw new ZeroDivisionError("integer division or modulo by zero");
    }
    d = Math.floor(ρσ_operator_truediv(x, y));
    return [d, ρσ_operator_sub(x, ρσ_operator_mul(d, y))];
};
ρσ_divmod.__argnames__ = ["x", "y"];
ρσ_divmod.__module__ = "__main__";
undefined;

function ρσ_max() {
    var kwargs = arguments[arguments.length-1];
    if (kwargs === null || typeof kwargs !== "object" || kwargs [ρσ_kwargs_symbol] !== true) kwargs = {};
    var args = Array.prototype.slice.call(arguments, 0);
    if (kwargs !== null && typeof kwargs === "object" && kwargs [ρσ_kwargs_symbol] === true) args.pop();
    var args, x;
    if (args.length === 0) {
        if (kwargs.defval !== undefined) {
            return kwargs.defval;
        }
        throw new TypeError("expected at least one argument");
    }
    if (args.length === 1) {
        args = args[0];
    }
    if (kwargs.key) {
        args = (function() {
            var ρσ_Iter = args, ρσ_Result = [], x;
            ρσ_Iter = ((typeof ρσ_Iter[Symbol.iterator] === "function") ? (ρσ_Iter instanceof Map ? ρσ_Iter.keys() : ρσ_Iter) : Object.keys(ρσ_Iter));
            for (var ρσ_Index of ρσ_Iter) {
                x = ρσ_Index;
                ρσ_Result.push(kwargs.key(x));
            }
            ρσ_Result = ρσ_list_constructor(ρσ_Result);
            return ρσ_Result;
        })();
    }
    if (!Array.isArray(args)) {
        args = (list?.__call__?.bind(list) ?? list)(args);
    }
    if (args.length) {
        return this.apply(null, args);
    }
    if (kwargs.defval !== undefined) {
        return kwargs.defval;
    }
    throw new TypeError("expected at least one argument");
};
ρσ_max.__handles_kwarg_interpolation__ = true;
ρσ_max.__module__ = "__main__";
undefined;

var round = ρσ_round; var max = ρσ_max.bind(Math.max), min = ρσ_max.bind(Math.min), bool = ρσ_bool, type = ρσ_type;
var float = ρσ_float, int = ρσ_int, arraylike = ρσ_arraylike_creator(), ρσ_arraylike = arraylike;
var print = ρσ_print, id = ρσ_id, get_module = ρσ_get_module, pow = ρσ_pow, divmod = ρσ_divmod;
var dir = ρσ_dir, ord = ρσ_ord, chr = ρσ_chr, bin = ρσ_bin, hex = ρσ_hex, callable = ρσ_callable;
var enumerate = ρσ_enumerate, iter = ρσ_iter, reversed = ρσ_reversed, len = ρσ_len;
var range = ρσ_range, getattr = ρσ_getattr, setattr = ρσ_setattr, hasattr = ρσ_hasattr;function ρσ_equals(a, b) {
    var type_a, type_b, i, ρσ_unpack, akeys, bkeys, key, j;
    if (a === b) {
        return true;
    }
    type_a = typeof a;
    type_b = typeof b;
    if (type_a === type_b && (type_a === "number" || type_a === "string" || type_a === "boolean")) {
        return a === b;
    }
    if (a && typeof a.__eq__ === "function") {
        return a.__eq__(b);
    }
    if (b && typeof b.__eq__ === "function") {
        return b.__eq__(a);
    }
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(a) && (ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(b)) {
        if ((a.length !== b.length && (typeof a.length !== "object" || ρσ_not_equals(a.length, b.length)))) {
            return false;
        }
        var ρσ_Iter0 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(a));
        ρσ_Iter0 = ((typeof ρσ_Iter0[Symbol.iterator] === "function") ? (ρσ_Iter0 instanceof Map ? ρσ_Iter0.keys() : ρσ_Iter0) : Object.keys(ρσ_Iter0));
        for (var ρσ_Index0 of ρσ_Iter0) {
            i = ρσ_Index0;
            if (!(((a[(typeof i === "number" && i < 0) ? a.length + i : i] === b[(typeof i === "number" && i < 0) ? b.length + i : i] || typeof a[(typeof i === "number" && i < 0) ? a.length + i : i] === "object" && ρσ_equals(a[(typeof i === "number" && i < 0) ? a.length + i : i], b[(typeof i === "number" && i < 0) ? b.length + i : i]))))) {
                return false;
            }
        }
        return true;
    }
    if (typeof a === "object" && typeof b === "object" && a !== null && b !== null && (a.constructor === Object || Object.getPrototypeOf(a) === null) && (b.constructor === Object || Object.getPrototypeOf(b) === null)) {
        ρσ_unpack = [Object.keys(a), Object.keys(b)];
        akeys = ρσ_unpack[0];
        bkeys = ρσ_unpack[1];
        if (akeys.length !== bkeys.length) {
            return false;
        }
        var ρσ_Iter1 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(akeys));
        ρσ_Iter1 = ((typeof ρσ_Iter1[Symbol.iterator] === "function") ? (ρσ_Iter1 instanceof Map ? ρσ_Iter1.keys() : ρσ_Iter1) : Object.keys(ρσ_Iter1));
        for (var ρσ_Index1 of ρσ_Iter1) {
            j = ρσ_Index1;
            key = akeys[(typeof j === "number" && j < 0) ? akeys.length + j : j];
            if (!(((a[(typeof key === "number" && key < 0) ? a.length + key : key] === b[(typeof key === "number" && key < 0) ? b.length + key : key] || typeof a[(typeof key === "number" && key < 0) ? a.length + key : key] === "object" && ρσ_equals(a[(typeof key === "number" && key < 0) ? a.length + key : key], b[(typeof key === "number" && key < 0) ? b.length + key : key]))))) {
                return false;
            }
        }
        return true;
    }
    return false;
};
ρσ_equals.__argnames__ = ["a", "b"];
ρσ_equals.__module__ = "__main__";
undefined;

function ρσ_not_equals(a, b) {
    if (a === b) {
        return false;
    }
    if (a && typeof a.__ne__ === "function") {
        return a.__ne__(b);
    }
    if (b && typeof b.__ne__ === "function") {
        return b.__ne__(a);
    }
    return !(ρσ_equals?.__call__?.bind(ρσ_equals) ?? ρσ_equals)(a, b);
};
ρσ_not_equals.__argnames__ = ["a", "b"];
ρσ_not_equals.__module__ = "__main__";
undefined;

var equals = ρσ_equals;
function ρσ_list_extend(iterable) {
    var start, iterator, result;
    if (Array.isArray(iterable) || typeof iterable === "string") {
        start = this.length;
        this.length = ρσ_operator_iadd(this.length, iterable.length);
        for (var i = 0; i < iterable.length; i++) {
            (ρσ_expr_temp = this)[ρσ_bound_index(ρσ_operator_add(start, i), ρσ_expr_temp)] = iterable[(typeof i === "number" && i < 0) ? iterable.length + i : i];
        }
    } else {
        iterator = (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
        result = iterator.next();
        while (!result.done) {
            this.push(result.value);
            result = iterator.next();
        }
    }
};
ρσ_list_extend.__argnames__ = ["iterable"];
ρσ_list_extend.__module__ = "__main__";
undefined;

function ρσ_list_index(val, start, stop) {
    var idx;
    start = start || 0;
    if (start < 0) {
        start = ρσ_operator_add(this.length, start);
    }
    if (start < 0) {
        throw new ValueError(ρσ_operator_add(val, " is not in list"));
    }
    if (stop === undefined) {
        idx = this.indexOf(val, start);
        if (idx === -1) {
            throw new ValueError(ρσ_operator_add(val, " is not in list"));
        }
        return idx;
    }
    if (stop < 0) {
        stop = ρσ_operator_add(this.length, stop);
    }
    for (var i = start; i < stop; i++) {
        if (ρσ_equals((ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i], val)) {
            return i;
        }
    }
    throw new ValueError(ρσ_operator_add(val, " is not in list"));
};
ρσ_list_index.__argnames__ = ["val", "start", "stop"];
ρσ_list_index.__module__ = "__main__";
undefined;

function ρσ_list_pop(index) {
    var ans;
    if (this.length === 0) {
        throw new IndexError("list is empty");
    }
    if (index === undefined) {
        index = -1;
    }
    ans = this.splice(index, 1);
    if (!ans.length) {
        throw new IndexError("pop index out of range");
    }
    return ans[0];
};
ρσ_list_pop.__argnames__ = ["index"];
ρσ_list_pop.__module__ = "__main__";
undefined;

function ρσ_list_remove(value) {
    var idx;
    idx = this.indexOf(value);
    if (idx === -1) {
        throw new ValueError(ρσ_operator_add(value, " not in list"));
    }
    this.splice(idx, 1);
};
ρσ_list_remove.__argnames__ = ["value"];
ρσ_list_remove.__module__ = "__main__";
undefined;

function ρσ_list_to_string() {
    return ρσ_operator_add(ρσ_operator_add("[", this.join(", ")), "]");
};
ρσ_list_to_string.__module__ = "__main__";
undefined;

function ρσ_list_insert(index, val) {
    if (index < 0) {
        index = ρσ_operator_iadd(index, this.length);
    }
    index = (min?.__call__?.bind(min) ?? min)(this.length, (max?.__call__?.bind(max) ?? max)(index, 0));
    if (index === 0) {
        this.unshift(val);
        return;
    }
    for (var i = this.length; i > index; i--) {
        (ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i] = (ρσ_expr_temp = this)[ρσ_bound_index(ρσ_operator_sub(i, 1), ρσ_expr_temp)];
    }
    (ρσ_expr_temp = this)[(typeof index === "number" && index < 0) ? ρσ_expr_temp.length + index : index] = val;
};
ρσ_list_insert.__argnames__ = ["index", "val"];
ρσ_list_insert.__module__ = "__main__";
undefined;

function ρσ_list_copy() {
    return (ρσ_list_constructor?.__call__?.bind(ρσ_list_constructor) ?? ρσ_list_constructor)(this);
};
ρσ_list_copy.__module__ = "__main__";
undefined;

function ρσ_list_clear() {
    this.length = 0;
};
ρσ_list_clear.__module__ = "__main__";
undefined;

function ρσ_list_as_array() {
    return Array.prototype.slice.call(this);
};
ρσ_list_as_array.__module__ = "__main__";
undefined;

function ρσ_list_count(value) {
    return this.reduce((function() {
        var ρσ_anonfunc = function (n, val) {
            return ρσ_operator_add(n, (val === value));
        };
ρσ_anonfunc.__argnames__ = ["n", "val"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })(), 0);
};
ρσ_list_count.__argnames__ = ["value"];
ρσ_list_count.__module__ = "__main__";
undefined;

function ρσ_list_sort_key(value) {
    var t;
    t = typeof value;
    if (t === "string" || t === "number") {
        return value;
    }
    return value.toString();
};
ρσ_list_sort_key.__argnames__ = ["value"];
ρσ_list_sort_key.__module__ = "__main__";
undefined;

function ρσ_list_sort_cmp(a, b, ap, bp) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return ρσ_operator_sub(ap, bp);
};
ρσ_list_sort_cmp.__argnames__ = ["a", "b", "ap", "bp"];
ρσ_list_sort_cmp.__module__ = "__main__";
undefined;

function ρσ_list_sort() {
    var key = (arguments[0] === undefined || ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? ρσ_list_sort.__defaults__.key : arguments[0];
    var reverse = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? ρσ_list_sort.__defaults__.reverse : arguments[1];
    var ρσ_kwargs_obj = arguments[arguments.length-1];
    if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
    if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "key")){
        key = ρσ_kwargs_obj.key;
    }
    if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "reverse")){
        reverse = ρσ_kwargs_obj.reverse;
    }
    var mult, keymap, posmap, k;
    key = key || ρσ_list_sort_key;
    mult = (reverse) ? -1 : 1;
    keymap = (dict?.__call__?.bind(dict) ?? dict)();
    posmap = (dict?.__call__?.bind(dict) ?? dict)();
    for (var i=0; i < this.length; i++) {
        k = (ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
        keymap.set(k, (key?.__call__?.bind(key) ?? key)(k));
        posmap.set(k, i);
    }
    this.sort((function() {
        var ρσ_anonfunc = function (a, b) {
            return ρσ_operator_mul(mult, (ρσ_list_sort_cmp?.__call__?.bind(ρσ_list_sort_cmp) ?? ρσ_list_sort_cmp)(keymap.get(a), keymap.get(b), posmap.get(a), posmap.get(b)));
        };
ρσ_anonfunc.__argnames__ = ["a", "b"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })());
};
ρσ_list_sort.__defaults__ = {key:null, reverse:false};
ρσ_list_sort.__handles_kwarg_interpolation__ = true;
ρσ_list_sort.__argnames__ = ["key", "reverse"];
ρσ_list_sort.__module__ = "__main__";
undefined;

function ρσ_list_concat() {
    var ans;
    ans = Array.prototype.concat.apply(this, arguments);
    (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
    return ans;
};
ρσ_list_concat.__module__ = "__main__";
undefined;

function ρσ_list_slice() {
    var ans;
    ans = Array.prototype.slice.apply(this, arguments);
    (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
    return ans;
};
ρσ_list_slice.__module__ = "__main__";
undefined;

function ρσ_list_iterator(value) {
    var self;
    self = this;
    return {"_i":-1,"_list":self,"next":(function() {
        var ρσ_anonfunc = function () {
            this._i = ρσ_operator_iadd(this._i, 1);
            if (this._i >= this._list.length) {
                return {"done":true};
            }
            return {"done":false,"value":(ρσ_expr_temp = this._list)[ρσ_bound_index(this._i, ρσ_expr_temp)]};
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })()};
};
ρσ_list_iterator.__argnames__ = ["value"];
ρσ_list_iterator.__module__ = "__main__";
undefined;

function ρσ_list_len() {
    return this.length;
};
ρσ_list_len.__module__ = "__main__";
undefined;

function ρσ_list_contains(val) {
    for (var i = 0; i < this.length; i++) {
        if (ρσ_equals((ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i], val)) {
            return true;
        }
    }
    return false;
};
ρσ_list_contains.__argnames__ = ["val"];
ρσ_list_contains.__module__ = "__main__";
undefined;

function ρσ_list_eq(other) {
    if (!(ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(other)) {
        return false;
    }
    if ((this.length !== other.length && (typeof this.length !== "object" || ρσ_not_equals(this.length, other.length)))) {
        return false;
    }
    for (var i = 0; i < this.length; i++) {
        if (!((((ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i] === other[(typeof i === "number" && i < 0) ? other.length + i : i] || typeof (ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i] === "object" && ρσ_equals((ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i], other[(typeof i === "number" && i < 0) ? other.length + i : i]))))) {
            return false;
        }
    }
    return true;
};
ρσ_list_eq.__argnames__ = ["other"];
ρσ_list_eq.__module__ = "__main__";
undefined;

function ρσ_list_mul(other) {
    var ans, k, n;
    ans = ρσ_list_decorate([]);
    k = (int?.__call__?.bind(int) ?? int)(other);
    n = this.length;
    let s=0; for(let i=0; i<k; i++) { for(let j=0; j<n; j++) {ans[s++]=this[j];}};
    return ans;
};
ρσ_list_mul.__argnames__ = ["other"];
ρσ_list_mul.__module__ = "__main__";
undefined;

function ρσ_list_decorate(ans) {
    ans.append = Array.prototype.push;
    ans.toString = ρσ_list_to_string;
    ans.inspect = ρσ_list_to_string;
    ans.extend = ρσ_list_extend;
    ans.index = ρσ_list_index;
    ans.pypop = ρσ_list_pop;
    ans.remove = ρσ_list_remove;
    ans.insert = ρσ_list_insert;
    ans.copy = ρσ_list_copy;
    ans.clear = ρσ_list_clear;
    ans.count = ρσ_list_count;
    ans.concat = ρσ_list_concat;
    ans.pysort = ρσ_list_sort;
    ans.slice = ρσ_list_slice;
    ans.as_array = ρσ_list_as_array;
    ans.__len__ = ρσ_list_len;
    ans.__contains__ = ρσ_list_contains;
    ans.__eq__ = ρσ_list_eq;
    ans.__mul__ = ρσ_list_mul;
    ans.constructor = ρσ_list_constructor;
    if (typeof ans[ρσ_iterator_symbol] !== "function") {
        ans[ρσ_iterator_symbol] = ρσ_list_iterator;
    }
    return ans;
};
ρσ_list_decorate.__argnames__ = ["ans"];
ρσ_list_decorate.__module__ = "__main__";
undefined;

function ρσ_list_constructor(iterable) {
    var ans;
    if (iterable === undefined) {
        ans = [];
    } else if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        ans = new Array(iterable.length);
        for (var i = 0; i < iterable.length; i++) {
            ans[(typeof i === "number" && i < 0) ? ans.length + i : i] = iterable[(typeof i === "number" && i < 0) ? iterable.length + i : i];
        }
    } else if (typeof iterable[ρσ_iterator_symbol] === "function") {
        ans = Array.from(iterable);
    } else if (typeof iterable === "number") {
        ans = new Array(iterable);
    } else {
        ans = Object.keys(iterable);
    }
    return (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
};
ρσ_list_constructor.__argnames__ = ["iterable"];
ρσ_list_constructor.__module__ = "__main__";
undefined;

ρσ_list_constructor.__name__ = "list";
var list = ρσ_list_constructor, list_wrap = ρσ_list_decorate;
function sorted() {
    var iterable = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
    var key = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? sorted.__defaults__.key : arguments[1];
    var reverse = (arguments[2] === undefined || ( 2 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? sorted.__defaults__.reverse : arguments[2];
    var ρσ_kwargs_obj = arguments[arguments.length-1];
    if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
    if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "key")){
        key = ρσ_kwargs_obj.key;
    }
    if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "reverse")){
        reverse = ρσ_kwargs_obj.reverse;
    }
    var ans;
    ans = (ρσ_list_constructor?.__call__?.bind(ρσ_list_constructor) ?? ρσ_list_constructor)(iterable);
    ans.pysort(key, reverse);
    return ans;
};
sorted.__defaults__ = {key:null, reverse:false};
sorted.__handles_kwarg_interpolation__ = true;
sorted.__argnames__ = ["iterable", "key", "reverse"];
sorted.__module__ = "__main__";
undefined;

var ρσ_global_object_id = 0, ρσ_set_implementation;
function ρσ_set_keyfor(x) {
    var t, ans;
    t = typeof x;
    if (t === "string" || t === "number" || t === "boolean") {
        return ρσ_operator_add(ρσ_operator_add("_", t[0]), x);
    }
    if (x === null) {
        return "__!@#$0";
    }
    ans = x.ρσ_hash_key_prop;
    if (ans === undefined) {
        ans = "_!@#$" + (++ρσ_global_object_id);
        Object.defineProperty(x, "ρσ_hash_key_prop", {"value":ans});
    }
    return ans;
};
ρσ_set_keyfor.__argnames__ = ["x"];
ρσ_set_keyfor.__module__ = "__main__";
undefined;

function ρσ_set_polyfill() {
    this._store = {};
    this.size = 0;
};
ρσ_set_polyfill.__module__ = "__main__";
undefined;

ρσ_set_polyfill.prototype.add = (function() {
    var ρσ_anonfunc = function (x) {
        var key;
        key = (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x);
        if (!Object.prototype.hasOwnProperty.call(this._store, key)) {
            this.size = ρσ_operator_iadd(this.size, 1);
            (ρσ_expr_temp = this._store)[(typeof key === "number" && key < 0) ? ρσ_expr_temp.length + key : key] = x;
        }
        return this;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set_polyfill.prototype.clear = (function() {
    var ρσ_anonfunc = function (x) {
        this._store = {};
        this.size = 0;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set_polyfill.prototype.delete = (function() {
    var ρσ_anonfunc = function (x) {
        var key;
        key = (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x);
        if (Object.prototype.hasOwnProperty.call(this._store, key)) {
            this.size = ρσ_operator_isub(this.size, 1);
            delete this._store[key];
            return true;
        }
        return false;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set_polyfill.prototype.has = (function() {
    var ρσ_anonfunc = function (x) {
        return Object.prototype.hasOwnProperty.call(this._store, (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x));
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set_polyfill.prototype.values = (function() {
    var ρσ_anonfunc = function (x) {
        var ans;
        ans = {'_keys': Object.keys(this._store), '_i':-1, '_s':this._store};
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i >= this._keys.length) {
                    return {'done': true};
                }
                return {'done':false, 'value':this._s[this._keys[this._i]]};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
if (typeof Set !== "function" || typeof Set.prototype.delete !== "function") {
    ρσ_set_implementation = ρσ_set_polyfill;
} else {
    ρσ_set_implementation = Set;
}
function ρσ_set(iterable) {
    var ans, s, iterator, result, keys;
    if (this instanceof ρσ_set) {
        this.jsset = new ρσ_set_implementation;
        ans = this;
        if (iterable === undefined) {
            return ans;
        }
        s = ans.jsset;
        if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
            for (var i = 0; i < iterable.length; i++) {
                s.add(iterable[(typeof i === "number" && i < 0) ? iterable.length + i : i]);
            }
        } else if (typeof iterable[ρσ_iterator_symbol] === "function") {
            iterator = (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
            result = iterator.next();
            while (!result.done) {
                s.add(result.value);
                result = iterator.next();
            }
        } else {
            keys = Object.keys(iterable);
            for (var j=0; j < keys.length; j++) {
                s.add(keys[(typeof j === "number" && j < 0) ? keys.length + j : j]);
            }
        }
        return ans;
    } else {
        return new ρσ_set(iterable);
    }
};
ρσ_set.__argnames__ = ["iterable"];
ρσ_set.__module__ = "__main__";
undefined;

ρσ_set.prototype.__name__ = "set";
Object.defineProperties(ρσ_set.prototype, {"length":{"get":(function() {
    var ρσ_anonfunc = function () {
        return this.jsset.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()},"size":{"get":(function() {
    var ρσ_anonfunc = function () {
        return this.jsset.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()}});
ρσ_set.prototype.__len__ = (function() {
    var ρσ_anonfunc = function () {
        return this.jsset.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.has = ρσ_set.prototype.__contains__ = (function() {
    var ρσ_anonfunc = function (x) {
        return this.jsset.has(x);
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.add = (function() {
    var ρσ_anonfunc = function (x) {
        this.jsset.add(x);
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.clear = (function() {
    var ρσ_anonfunc = function () {
        this.jsset.clear();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.copy = (function() {
    var ρσ_anonfunc = function () {
        return (ρσ_set?.__call__?.bind(ρσ_set) ?? ρσ_set)(this);
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.discard = (function() {
    var ρσ_anonfunc = function (x) {
        this.jsset.delete(x);
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype[ρσ_iterator_symbol] = (function() {
    var ρσ_anonfunc = function () {
        return this.jsset.values();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.difference = (function() {
    var ρσ_anonfunc = function () {
        var ans, s, iterator, r, x, has;
        ans = new ρσ_set;
        s = ans.jsset;
        iterator = this.jsset.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            has = false;
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].has(x)) {
                    has = true;
                    break;
                }
            }
            if (!has) {
                s.add(x);
            }
            r = iterator.next();
        }
        return ans;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.difference_update = (function() {
    var ρσ_anonfunc = function () {
        var s, remove, iterator, r, x;
        s = this.jsset;
        remove = [];
        iterator = s.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].has(x)) {
                    remove.push(x);
                    break;
                }
            }
            r = iterator.next();
        }
        for (var j = 0; j < remove.length; j++) {
            s.delete(remove[(typeof j === "number" && j < 0) ? remove.length + j : j]);
        }
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.intersection = (function() {
    var ρσ_anonfunc = function () {
        var ans, s, iterator, r, x, has;
        ans = new ρσ_set;
        s = ans.jsset;
        iterator = this.jsset.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            has = true;
            for (var i = 0; i < arguments.length; i++) {
                if (!arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].has(x)) {
                    has = false;
                    break;
                }
            }
            if (has) {
                s.add(x);
            }
            r = iterator.next();
        }
        return ans;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.intersection_update = (function() {
    var ρσ_anonfunc = function () {
        var s, remove, iterator, r, x;
        s = this.jsset;
        remove = [];
        iterator = s.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            for (var i = 0; i < arguments.length; i++) {
                if (!arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].has(x)) {
                    remove.push(x);
                    break;
                }
            }
            r = iterator.next();
        }
        for (var j = 0; j < remove.length; j++) {
            s.delete(remove[(typeof j === "number" && j < 0) ? remove.length + j : j]);
        }
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.isdisjoint = (function() {
    var ρσ_anonfunc = function (other) {
        var iterator, r, x;
        iterator = this.jsset.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            if (other.has(x)) {
                return false;
            }
            r = iterator.next();
        }
        return true;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.issubset = (function() {
    var ρσ_anonfunc = function (other) {
        var iterator, r, x;
        iterator = this.jsset.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            if (!other.has(x)) {
                return false;
            }
            r = iterator.next();
        }
        return true;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.issuperset = (function() {
    var ρσ_anonfunc = function (other) {
        var s, iterator, r, x;
        s = this.jsset;
        iterator = other.jsset.values();
        r = iterator.next();
        while (!r.done) {
            x = r.value;
            if (!s.has(x)) {
                return false;
            }
            r = iterator.next();
        }
        return true;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.pop = (function() {
    var ρσ_anonfunc = function () {
        var iterator, r;
        iterator = this.jsset.values();
        r = iterator.next();
        if (r.done) {
            throw new KeyError("pop from an empty set");
        }
        this.jsset.delete(r.value);
        return r.value;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.remove = (function() {
    var ρσ_anonfunc = function (x) {
        if (!this.jsset.delete(x)) {
            throw new KeyError(x.toString());
        }
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.symmetric_difference = (function() {
    var ρσ_anonfunc = function (other) {
        return this.union(other).difference(this.intersection(other));
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.symmetric_difference_update = (function() {
    var ρσ_anonfunc = function (other) {
        var common;
        common = this.intersection(other);
        this.update(other);
        this.difference_update(common);
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.union = (function() {
    var ρσ_anonfunc = function () {
        var ans;
        ans = (ρσ_set?.__call__?.bind(ρσ_set) ?? ρσ_set)(this);
        ans.update.apply(ans, arguments);
        return ans;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.update = (function() {
    var ρσ_anonfunc = function () {
        var s, iterator, r;
        s = this.jsset;
        for (var i=0; i < arguments.length; i++) {
            iterator = arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i][ρσ_iterator_symbol]();
            r = iterator.next();
            while (!r.done) {
                s.add(r.value);
                r = iterator.next();
            }
        }
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.toString = ρσ_set.prototype.__repr__ = ρσ_set.prototype.__str__ = ρσ_set.prototype.inspect = (function() {
    var ρσ_anonfunc = function () {
        return ρσ_operator_add(ρσ_operator_add("{", (list?.__call__?.bind(list) ?? list)(this).join(", ")), "}");
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_set.prototype.__eq__ = (function() {
    var ρσ_anonfunc = function (other) {
        var iterator, r;
        if (!other instanceof this.constructor) {
            return false;
        }
        if (other.size !== this.size) {
            return false;
        }
        if (other.size === 0) {
            return true;
        }
        iterator = other[ρσ_iterator_symbol]();
        r = iterator.next();
        while (!r.done) {
            if (!this.has(r.value)) {
                return false;
            }
            r = iterator.next();
        }
        return true;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
function ρσ_set_wrap(x) {
    var ans;
    ans = new ρσ_set;
    ans.jsset = x;
    return ans;
};
ρσ_set_wrap.__argnames__ = ["x"];
ρσ_set_wrap.__module__ = "__main__";
undefined;

var set = ρσ_set, set_wrap = ρσ_set_wrap;
var ρσ_dict_implementation;
function ρσ_dict_polyfill() {
    this._store = {};
    this.size = 0;
};
ρσ_dict_polyfill.__module__ = "__main__";
undefined;

ρσ_dict_polyfill.prototype.set = (function() {
    var ρσ_anonfunc = function (x, value) {
        var key;
        key = (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x);
        if (!Object.prototype.hasOwnProperty.call(this._store, key)) {
            this.size = ρσ_operator_iadd(this.size, 1);
        }
        (ρσ_expr_temp = this._store)[(typeof key === "number" && key < 0) ? ρσ_expr_temp.length + key : key] = [x, value];
        return this;
    };
ρσ_anonfunc.__argnames__ = ["x", "value"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.clear = (function() {
    var ρσ_anonfunc = function (x) {
        this._store = {};
        this.size = 0;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.delete = (function() {
    var ρσ_anonfunc = function (x) {
        var key;
        key = (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x);
        if (Object.prototype.hasOwnProperty.call(this._store, key)) {
            this.size = ρσ_operator_isub(this.size, 1);
            delete this._store[key];
            return true;
        }
        return false;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.has = (function() {
    var ρσ_anonfunc = function (x) {
        return Object.prototype.hasOwnProperty.call(this._store, (ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x));
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.get = (function() {
    var ρσ_anonfunc = function (x) {
        try {
            return (ρσ_expr_temp = this._store)[ρσ_bound_index((ρσ_set_keyfor?.__call__?.bind(ρσ_set_keyfor) ?? ρσ_set_keyfor)(x), ρσ_expr_temp)][1];
        } catch (ρσ_Exception) {
            ρσ_last_exception = ρσ_Exception;
            if (ρσ_Exception instanceof TypeError) {
                return undefined;
            } else {
                throw ρσ_Exception;
            }
        }
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.values = (function() {
    var ρσ_anonfunc = function (x) {
        var ans;
        ans = {'_keys': Object.keys(this._store), '_i':-1, '_s':this._store};
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i >= this._keys.length) {
                    return {'done': true};
                }
                return {'done':false, 'value':this._s[this._keys[this._i]][1]};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.keys = (function() {
    var ρσ_anonfunc = function (x) {
        var ans;
        ans = {'_keys': Object.keys(this._store), '_i':-1, '_s':this._store};
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i >= this._keys.length) {
                    return {'done': true};
                }
                return {'done':false, 'value':this._s[this._keys[this._i]][0]};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict_polyfill.prototype.entries = (function() {
    var ρσ_anonfunc = function (x) {
        var ans;
        ans = {'_keys': Object.keys(this._store), '_i':-1, '_s':this._store};
        ans[ρσ_iterator_symbol] = (function() {
            var ρσ_anonfunc = function () {
                return this;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        ans["next"] = (function() {
            var ρσ_anonfunc = function () {
                this._i = ρσ_operator_iadd(this._i, 1);
                if (this._i >= this._keys.length) {
                    return {'done': true};
                }
                return {'done':false, 'value':this._s[this._keys[this._i]]};
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
if (typeof Map !== "function" || typeof Map.prototype.delete !== "function") {
    ρσ_dict_implementation = ρσ_dict_polyfill;
} else {
    ρσ_dict_implementation = Map;
}
function ρσ_dict() {
    var iterable = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
    var kw = arguments[arguments.length-1];
    if (kw === null || typeof kw !== "object" || kw [ρσ_kwargs_symbol] !== true) kw = {};
    if (this instanceof ρσ_dict) {
        this.jsmap = new ρσ_dict_implementation;
        if (iterable !== undefined) {
            this.update(iterable);
        }
        this.update(kw);
        return this;
    } else {
        return ρσ_interpolate_kwargs_constructor.call(Object.create(ρσ_dict.prototype), false, ρσ_dict, [iterable].concat([ρσ_desugar_kwargs(kw)]));
    }
};
ρσ_dict.__handles_kwarg_interpolation__ = true;
ρσ_dict.__argnames__ = ["iterable"];
ρσ_dict.__module__ = "__main__";
undefined;

ρσ_dict.prototype.__name__ = "dict";
Object.defineProperties(ρσ_dict.prototype, {"length":{"get":(function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()},"size":{"get":(function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()}});
ρσ_dict.prototype.__len__ = (function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.size;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.has = ρσ_dict.prototype.__contains__ = (function() {
    var ρσ_anonfunc = function (x) {
        return this.jsmap.has(x);
    };
ρσ_anonfunc.__argnames__ = ["x"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.set = ρσ_dict.prototype.__setitem__ = (function() {
    var ρσ_anonfunc = function (key, value) {
        this.jsmap.set(key, value);
    };
ρσ_anonfunc.__argnames__ = ["key", "value"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.__delitem__ = (function() {
    var ρσ_anonfunc = function (key) {
        this.jsmap.delete(key);
    };
ρσ_anonfunc.__argnames__ = ["key"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.clear = (function() {
    var ρσ_anonfunc = function () {
        this.jsmap.clear();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.copy = (function() {
    var ρσ_anonfunc = function () {
        return (ρσ_dict?.__call__?.bind(ρσ_dict) ?? ρσ_dict)(this);
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.keys = (function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.keys();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.values = (function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.values();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.items = ρσ_dict.prototype.entries = (function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.entries();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype[ρσ_iterator_symbol] = (function() {
    var ρσ_anonfunc = function () {
        return this.jsmap.keys();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.__getitem__ = (function() {
    var ρσ_anonfunc = function (key) {
        var ans;
        ans = this.jsmap.get(key);
        if (ans === undefined && !this.jsmap.has(key)) {
            throw new KeyError(ρσ_operator_add(key, ""));
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["key"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.get = (function() {
    var ρσ_anonfunc = function (key, defval) {
        var ans;
        ans = this.jsmap.get(key);
        if (ans === undefined && !this.jsmap.has(key)) {
            return (defval === undefined) ? null : defval;
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["key", "defval"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.set_default = (function() {
    var ρσ_anonfunc = function (key, defval) {
        var j;
        j = this.jsmap;
        if (!j.has(key)) {
            j.set(key, defval);
            return defval;
        }
        return j.get(key);
    };
ρσ_anonfunc.__argnames__ = ["key", "defval"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.fromkeys = ρσ_dict.prototype.fromkeys = (function() {
    var ρσ_anonfunc = function () {
        var iterable = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
        var value = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? ρσ_anonfunc.__defaults__.value : arguments[1];
        var ρσ_kwargs_obj = arguments[arguments.length-1];
        if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
        if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "value")){
            value = ρσ_kwargs_obj.value;
        }
        var ans, iterator, r;
        ans = (ρσ_dict?.__call__?.bind(ρσ_dict) ?? ρσ_dict)();
        iterator = (iter?.__call__?.bind(iter) ?? iter)(iterable);
        r = iterator.next();
        while (!r.done) {
            ans.set(r.value, value);
            r = iterator.next();
        }
        return ans;
    };
ρσ_anonfunc.__defaults__ = {value:null};
ρσ_anonfunc.__handles_kwarg_interpolation__ = true;
ρσ_anonfunc.__argnames__ = ["iterable", "value"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.pop = (function() {
    var ρσ_anonfunc = function (key, defval) {
        var ans;
        ans = this.jsmap.get(key);
        if (ans === undefined && !this.jsmap.has(key)) {
            if (defval === undefined) {
                throw new KeyError(key);
            }
            return defval;
        }
        this.jsmap.delete(key);
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["key", "defval"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.popitem = (function() {
    var ρσ_anonfunc = function () {
        var r;
        r = this.jsmap.entries().next();
        if (r.done) {
            throw new KeyError("dict is empty");
        }
        this.jsmap.delete(r.value[0]);
        return r.value;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.update = (function() {
    var ρσ_anonfunc = function () {
        var m, iterable, iterator, result, keys;
        if (arguments.length === 0) {
            return;
        }
        m = this.jsmap;
        iterable = arguments[0];
        if (Array.isArray(iterable)) {
            for (var i = 0; i < iterable.length; i++) {
                m.set(iterable[(typeof i === "number" && i < 0) ? iterable.length + i : i][0], iterable[(typeof i === "number" && i < 0) ? iterable.length + i : i][1]);
            }
        } else if (iterable instanceof ρσ_dict) {
            iterator = iterable.items();
            result = iterator.next();
            while (!result.done) {
                m.set(result.value[0], result.value[1]);
                result = iterator.next();
            }
        } else if (typeof Map === "function" && iterable instanceof Map) {
            iterator = iterable.entries();
            result = iterator.next();
            while (!result.done) {
                m.set(result.value[0], result.value[1]);
                result = iterator.next();
            }
        } else if (typeof iterable[ρσ_iterator_symbol] === "function") {
            iterator = iterable[ρσ_iterator_symbol]();
            result = iterator.next();
            while (!result.done) {
                m.set(result.value[0], result.value[1]);
                result = iterator.next();
            }
        } else {
            keys = Object.keys(iterable);
            for (var j=0; j < keys.length; j++) {
                if (keys[(typeof j === "number" && j < 0) ? keys.length + j : j] !== ρσ_iterator_symbol) {
                    m.set(keys[(typeof j === "number" && j < 0) ? keys.length + j : j], iterable[ρσ_bound_index(keys[(typeof j === "number" && j < 0) ? keys.length + j : j], iterable)]);
                }
            }
        }
        if (arguments.length > 1) {
            ρσ_dict.prototype.update.call(this, arguments[1]);
        }
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.toString = ρσ_dict.prototype.inspect = ρσ_dict.prototype.__str__ = ρσ_dict.prototype.__repr__ = (function() {
    var ρσ_anonfunc = function () {
        var entries, iterator, r;
        entries = [];
        iterator = this.jsmap.entries();
        r = iterator.next();
        while (!r.done) {
            entries.push(ρσ_operator_add(ρσ_operator_add((ρσ_repr?.__call__?.bind(ρσ_repr) ?? ρσ_repr)(r.value[0]), ": "), (ρσ_repr?.__call__?.bind(ρσ_repr) ?? ρσ_repr)(r.value[1])));
            r = iterator.next();
        }
        return ρσ_operator_add(ρσ_operator_add("{", entries.join(", ")), "}");
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.__eq__ = (function() {
    var ρσ_anonfunc = function (other) {
        var iterator, r, x;
        if (!(other instanceof this.constructor)) {
            return false;
        }
        if (other.size !== this.size) {
            return false;
        }
        if (other.size === 0) {
            return true;
        }
        iterator = other.items();
        r = iterator.next();
        while (!r.done) {
            x = this.jsmap.get(r.value[0]);
            if (x === undefined && !this.jsmap.has(r.value[0]) || x !== r.value[1]) {
                return false;
            }
            r = iterator.next();
        }
        return true;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_dict.prototype.as_object = (function() {
    var ρσ_anonfunc = function (other) {
        var ans, iterator, r;
        ans = {};
        iterator = this.jsmap.entries();
        r = iterator.next();
        while (!r.done) {
            ans[ρσ_bound_index(r.value[0], ans)] = r.value[1];
            r = iterator.next();
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["other"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
function ρσ_dict_wrap(x) {
    var ans;
    ans = new ρσ_dict;
    ans.jsmap = x;
    return ans;
};
ρσ_dict_wrap.__argnames__ = ["x"];
ρσ_dict_wrap.__module__ = "__main__";
undefined;

var dict = ρσ_dict, dict_wrap = ρσ_dict_wrap;// }}}
var NameError;
NameError = ReferenceError;
function Exception() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    Exception.prototype.__init__.apply(this, arguments);
}
ρσ_extends(Exception, Error);
Exception.prototype.__init__ = function __init__(message) {
    var self = this;
    self.message = message;
    self.stack = (new Error).stack;
    self.name = self.constructor.name;
};
Exception.prototype.__init__.__argnames__ = ["message"];
Exception.prototype.__init__.__module__ = "__main__";
undefined;
Exception.__argnames__ = Exception.prototype.__init__.__argnames__;
Exception.__handles_kwarg_interpolation__ = Exception.prototype.__init__.__handles_kwarg_interpolation__;
Exception.prototype.__repr__ = function __repr__() {
    var self = this;
    return ρσ_operator_add(ρσ_operator_add(self.name, ": "), self.message);
};
Exception.prototype.__repr__.__module__ = "__main__";
undefined;
Exception.prototype.__str__ = function __str__ () {
    if(Error.prototype.__str__) return Error.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(Exception.prototype, "__bases__", {value: [Error]});

function AttributeError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    AttributeError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(AttributeError, Exception);
AttributeError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
AttributeError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
AttributeError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(AttributeError.prototype, "__bases__", {value: [Exception]});


function IndexError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    IndexError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(IndexError, Exception);
IndexError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
IndexError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
IndexError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(IndexError.prototype, "__bases__", {value: [Exception]});


function KeyError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    KeyError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(KeyError, Exception);
KeyError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
KeyError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
KeyError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(KeyError.prototype, "__bases__", {value: [Exception]});


function ValueError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    ValueError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(ValueError, Exception);
ValueError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
ValueError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
ValueError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(ValueError.prototype, "__bases__", {value: [Exception]});


function UnicodeDecodeError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    UnicodeDecodeError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(UnicodeDecodeError, Exception);
UnicodeDecodeError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
UnicodeDecodeError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
UnicodeDecodeError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(UnicodeDecodeError.prototype, "__bases__", {value: [Exception]});


function AssertionError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    AssertionError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(AssertionError, Exception);
AssertionError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
AssertionError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
AssertionError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(AssertionError.prototype, "__bases__", {value: [Exception]});


function ZeroDivisionError() {
    if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
    ZeroDivisionError.prototype.__init__.apply(this, arguments);
}
ρσ_extends(ZeroDivisionError, Exception);
ZeroDivisionError.prototype.__init__ = function __init__ () {
    Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
};
ZeroDivisionError.prototype.__repr__ = function __repr__ () {
    if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
    return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
};
ZeroDivisionError.prototype.__str__ = function __str__ () {
    if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
};
Object.defineProperty(ZeroDivisionError.prototype, "__bases__", {value: [Exception]});

var ρσ_in, ρσ_desugar_kwargs, ρσ_exists;
function ρσ_eslice(arr, step, start, end) {
    var is_string;
    if (typeof arr === "string" || arr instanceof String) {
        is_string = true;
        arr = arr.split("");
    }
    if (step < 0) {
        step = -step;
        arr = arr.slice().reverse();
        if (typeof start !== "undefined") {
            start = ρσ_operator_sub(ρσ_operator_sub(arr.length, start), 1);
        }
        if (typeof end !== "undefined") {
            end = ρσ_operator_sub(ρσ_operator_sub(arr.length, end), 1);
        }
    }
    if (typeof start === "undefined") {
        start = 0;
    }
    if (typeof end === "undefined") {
        end = arr.length;
    }
    arr = arr.slice(start, end).filter((function() {
        var ρσ_anonfunc = function (e, i) {
            return i % step === 0;
        };
ρσ_anonfunc.__argnames__ = ["e", "i"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })());
    if (is_string) {
        arr = arr.join("");
    }
    return arr;
};
ρσ_eslice.__argnames__ = ["arr", "step", "start", "end"];
ρσ_eslice.__module__ = "__main__";
undefined;

function ρσ_delslice(arr, step, start, end) {
    var is_string, ρσ_unpack, indices;
    if (typeof arr === "string" || arr instanceof String) {
        is_string = true;
        arr = arr.split("");
    }
    if (step < 0) {
        if (typeof start === "undefined") {
            start = arr.length;
        }
        if (typeof end === "undefined") {
            end = 0;
        }
        ρσ_unpack = [end, start, -step];
        start = ρσ_unpack[0];
        end = ρσ_unpack[1];
        step = ρσ_unpack[2];
    }
    if (typeof start === "undefined") {
        start = 0;
    }
    if (typeof end === "undefined") {
        end = arr.length;
    }
    if (step === 1) {
        arr.splice(start, ρσ_operator_sub(end, start));
    } else {
        if (end > start) {
            indices = [];
            for (var i = start; i < end; i += step) {
                indices.push(i);
            }
            for (var i = indices.length - 1; i >= 0; i--) {
                arr.splice(indices[(typeof i === "number" && i < 0) ? indices.length + i : i], 1);
            }
        }
    }
    if (is_string) {
        arr = arr.join("");
    }
    return arr;
};
ρσ_delslice.__argnames__ = ["arr", "step", "start", "end"];
ρσ_delslice.__module__ = "__main__";
undefined;

function ρσ_flatten(arr) {
    var ans, value;
    ans = ρσ_list_decorate([]);
    for (var i=0; i < arr.length; i++) {
        value = arr[(typeof i === "number" && i < 0) ? arr.length + i : i];
        if (Array.isArray(value)) {
            ans = ans.concat((ρσ_flatten?.__call__?.bind(ρσ_flatten) ?? ρσ_flatten)(value));
        } else {
            ans.push(value);
        }
    }
    return ans;
};
ρσ_flatten.__argnames__ = ["arr"];
ρσ_flatten.__module__ = "__main__";
undefined;

function ρσ_unpack_asarray(num, iterable) {
    var ans, iterator, result;
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        return iterable;
    }
    ans = [];
    if (typeof iterable[ρσ_iterator_symbol] === "function") {
        iterator = (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
        result = iterator.next();
        while (!result.done && ans.length < num) {
            ans.push(result.value);
            result = iterator.next();
        }
    }
    return ans;
};
ρσ_unpack_asarray.__argnames__ = ["num", "iterable"];
ρσ_unpack_asarray.__module__ = "__main__";
undefined;

function ρσ_extends(child, parent) {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
};
ρσ_extends.__argnames__ = ["child", "parent"];
ρσ_extends.__module__ = "__main__";
undefined;

ρσ_in = (function() {
    var ρσ_anonfunc = function () {
        if (typeof Map === "function" && typeof Set === "function") {
            return (function() {
                var ρσ_anonfunc = function (val, arr) {
                    if (typeof arr === "string") {
                        return arr.indexOf(val) !== -1;
                    }
                    if (typeof arr.__contains__ === "function") {
                        return arr.__contains__(val);
                    }
                    if (arr instanceof Map || arr instanceof Set) {
                        return arr.has(val);
                    }
                    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(arr)) {
                        return ρσ_list_contains.call(arr, val);
                    }
                    return Object.prototype.hasOwnProperty.call(arr, val);
                };
ρσ_anonfunc.__argnames__ = ["val", "arr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })();
        }
        return (function() {
            var ρσ_anonfunc = function (val, arr) {
                if (typeof arr === "string") {
                    return arr.indexOf(val) !== -1;
                }
                if (typeof arr.__contains__ === "function") {
                    return arr.__contains__(val);
                }
                if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(arr)) {
                    return ρσ_list_contains.call(arr, val);
                }
                return Object.prototype.hasOwnProperty.call(arr, val);
            };
ρσ_anonfunc.__argnames__ = ["val", "arr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()();
function ρσ_Iterable(iterable) {
    var iterator, ans, result;
    if ((ρσ_arraylike?.__call__?.bind(ρσ_arraylike) ?? ρσ_arraylike)(iterable)) {
        return iterable;
    }
    if (typeof iterable[ρσ_iterator_symbol] === "function") {
        iterator = (typeof Map === "function" && iterable instanceof Map) ? iterable.keys() : iterable[ρσ_iterator_symbol]();
        ans = ρσ_list_decorate([]);
        result = iterator.next();
        while (!result.done) {
            ans.push(result.value);
            result = iterator.next();
        }
        return ans;
    }
    return Object.keys(iterable);
};
ρσ_Iterable.__argnames__ = ["iterable"];
ρσ_Iterable.__module__ = "__main__";
undefined;

ρσ_desugar_kwargs = (function() {
    var ρσ_anonfunc = function () {
        if (typeof Object.assign === "function") {
            return (function() {
                var ρσ_anonfunc = function () {
                    var ans;
                    ans = Object.create(null);
                    ans[ρσ_kwargs_symbol] = true;
                    for (var i = 0; i < arguments.length; i++) {
                        Object.assign(ans, arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]);
                    }
                    return ans;
                };
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })();
        }
        return (function() {
            var ρσ_anonfunc = function () {
                var ans, keys;
                ans = Object.create(null);
                ans[ρσ_kwargs_symbol] = true;
                for (var i = 0; i < arguments.length; i++) {
                    keys = Object.keys(arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]);
                    for (var j = 0; j < keys.length; j++) {
                        ans[ρσ_bound_index(keys[(typeof j === "number" && j < 0) ? keys.length + j : j], ans)] = (ρσ_expr_temp = arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i])[ρσ_bound_index(keys[(typeof j === "number" && j < 0) ? keys.length + j : j], ρσ_expr_temp)];
                    }
                }
                return ans;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()();
function ρσ_interpolate_kwargs(f, supplied_args) {
    var has_prop, kwobj, args, prop;
    if (!f.__argnames__) {
        return f.apply(this, supplied_args);
    }
    has_prop = Object.prototype.hasOwnProperty;
    kwobj = supplied_args.pop();
    if (f.__handles_kwarg_interpolation__) {
        args = new Array(ρσ_operator_add(Math.max(supplied_args.length, f.__argnames__.length), 1));
        args[args.length-1] = kwobj;
        for (var i = 0; i < args.length - 1; i++) {
            if (i < f.__argnames__.length) {
                prop = (ρσ_expr_temp = f.__argnames__)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
                if (has_prop.call(kwobj, prop)) {
                    args[(typeof i === "number" && i < 0) ? args.length + i : i] = kwobj[(typeof prop === "number" && prop < 0) ? kwobj.length + prop : prop];
                    delete kwobj[prop];
                } else if (i < supplied_args.length) {
                    args[(typeof i === "number" && i < 0) ? args.length + i : i] = supplied_args[(typeof i === "number" && i < 0) ? supplied_args.length + i : i];
                }
            } else {
                args[(typeof i === "number" && i < 0) ? args.length + i : i] = supplied_args[(typeof i === "number" && i < 0) ? supplied_args.length + i : i];
            }
        }
        return f.apply(this, args);
    }
    for (var i = 0; i < f.__argnames__.length; i++) {
        prop = (ρσ_expr_temp = f.__argnames__)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
        if (has_prop.call(kwobj, prop)) {
            supplied_args[(typeof i === "number" && i < 0) ? supplied_args.length + i : i] = kwobj[(typeof prop === "number" && prop < 0) ? kwobj.length + prop : prop];
        }
    }
    return f.apply(this, supplied_args);
};
ρσ_interpolate_kwargs.__argnames__ = ["f", "supplied_args"];
ρσ_interpolate_kwargs.__module__ = "__main__";
undefined;

function ρσ_interpolate_kwargs_constructor(apply, f, supplied_args) {
    if (apply) {
        f.apply(this, supplied_args);
    } else {
        ρσ_interpolate_kwargs.call(this, f, supplied_args);
    }
    return this;
};
ρσ_interpolate_kwargs_constructor.__argnames__ = ["apply", "f", "supplied_args"];
ρσ_interpolate_kwargs_constructor.__module__ = "__main__";
undefined;

function ρσ_getitem(obj, key) {
    if (obj.__getitem__) {
        return obj.__getitem__(key);
    }
    if (typeof key === "number" && key < 0) {
        key = ρσ_operator_iadd(key, obj.length);
    }
    return obj[(typeof key === "number" && key < 0) ? obj.length + key : key];
};
ρσ_getitem.__argnames__ = ["obj", "key"];
ρσ_getitem.__module__ = "__main__";
undefined;

function ρσ_setitem(obj, key, val) {
    if (obj.__setitem__) {
        obj.__setitem__(key, val);
    } else {
        if (typeof key === "number" && key < 0) {
            key = ρσ_operator_iadd(key, obj.length);
        }
        obj[(typeof key === "number" && key < 0) ? obj.length + key : key] = val;
    }
};
ρσ_setitem.__argnames__ = ["obj", "key", "val"];
ρσ_setitem.__module__ = "__main__";
undefined;

function ρσ_delitem(obj, key) {
    if (obj.__delitem__) {
        obj.__delitem__(key);
    } else if (typeof obj.splice === "function") {
        obj.splice(key, 1);
    } else {
        if (typeof key === "number" && key < 0) {
            key = ρσ_operator_iadd(key, obj.length);
        }
        delete obj[key];
    }
};
ρσ_delitem.__argnames__ = ["obj", "key"];
ρσ_delitem.__module__ = "__main__";
undefined;

function ρσ_bound_index(idx, arr) {
    if (typeof idx === "number" && idx < 0) {
        idx = ρσ_operator_iadd(idx, arr.length);
    }
    return idx;
};
ρσ_bound_index.__argnames__ = ["idx", "arr"];
ρσ_bound_index.__module__ = "__main__";
undefined;

function ρσ_splice(arr, val, start, end) {
    start = start || 0;
    if (start < 0) {
        start = ρσ_operator_iadd(start, arr.length);
    }
    if (end === undefined) {
        end = arr.length;
    }
    if (end < 0) {
        end = ρσ_operator_iadd(end, arr.length);
    }
    Array.prototype.splice.apply(arr, [start, end - start].concat(val));
};
ρσ_splice.__argnames__ = ["arr", "val", "start", "end"];
ρσ_splice.__module__ = "__main__";
undefined;

ρσ_exists = {"n":(function() {
    var ρσ_anonfunc = function (expr) {
        return expr !== undefined && expr !== null;
    };
ρσ_anonfunc.__argnames__ = ["expr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})(),"d":(function() {
    var ρσ_anonfunc = function (expr) {
        if (expr === undefined || expr === null) {
            return Object.create(null);
        }
        return expr;
    };
ρσ_anonfunc.__argnames__ = ["expr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})(),"c":(function() {
    var ρσ_anonfunc = function (expr) {
        if (typeof expr === "function") {
            return expr;
        }
        return (function() {
            var ρσ_anonfunc = function () {
                return undefined;
            };
ρσ_anonfunc.__module__ = "__main__";
undefined;
            return ρσ_anonfunc;
        })();
    };
ρσ_anonfunc.__argnames__ = ["expr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})(),"g":(function() {
    var ρσ_anonfunc = function (expr) {
        if (expr === undefined || expr === null || typeof expr.__getitem__ !== "function") {
            return {"__getitem__":(function() {
                var ρσ_anonfunc = function () {
                    return undefined;
                };
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })()};
        }
    };
ρσ_anonfunc.__argnames__ = ["expr"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})(),"e":(function() {
    var ρσ_anonfunc = function (expr, alt) {
        return (expr === undefined || expr === null) ? alt : expr;
    };
ρσ_anonfunc.__argnames__ = ["expr", "alt"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})()};
function ρσ_mixin() {
    var seen, resolved_props, p, target, props, name;
    seen = Object.create(null);
    seen.__argnames__ = seen.__handles_kwarg_interpolation__ = seen.__init__ = seen.__annotations__ = seen.__doc__ = seen.__bind_methods__ = seen.__bases__ = seen.constructor = seen.__class__ = true;
    resolved_props = {};
    p = target = arguments[0].prototype;
    while (p && p !== Object.prototype) {
        props = Object.getOwnPropertyNames(p);
        for (var i = 0; i < props.length; i++) {
            seen[ρσ_bound_index(props[(typeof i === "number" && i < 0) ? props.length + i : i], seen)] = true;
        }
        p = Object.getPrototypeOf(p);
    }
    for (var c = 1; c < arguments.length; c++) {
        p = arguments[(typeof c === "number" && c < 0) ? arguments.length + c : c].prototype;
        while (p && p !== Object.prototype) {
            props = Object.getOwnPropertyNames(p);
            for (var i = 0; i < props.length; i++) {
                name = props[(typeof i === "number" && i < 0) ? props.length + i : i];
                if (seen[(typeof name === "number" && name < 0) ? seen.length + name : name]) {
                    continue;
                }
                seen[(typeof name === "number" && name < 0) ? seen.length + name : name] = true;
                resolved_props[(typeof name === "number" && name < 0) ? resolved_props.length + name : name] = Object.getOwnPropertyDescriptor(p, name);
            }
            p = Object.getPrototypeOf(p);
        }
    }
    Object.defineProperties(target, resolved_props);
};
ρσ_mixin.__module__ = "__main__";
undefined;

function ρσ_instanceof() {
    var obj, bases, q, cls, p;
    obj = arguments[0];
    bases = "";
    if (obj && obj.constructor && obj.constructor.prototype) {
        bases = obj.constructor.prototype.__bases__ || "";
    }
    for (var i = 1; i < arguments.length; i++) {
        q = arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i];
        if (obj instanceof q) {
            return true;
        }
        if ((q === Array || q === ρσ_list_constructor) && Array.isArray(obj)) {
            return true;
        }
        if (q === ρσ_str && (typeof obj === "string" || obj instanceof String)) {
            return true;
        }
        if (q === ρσ_int && typeof obj === "number" && Number.isInteger(obj)) {
            return true;
        }
        if (q === ρσ_float && typeof obj === "number" && !Number.isInteger(obj)) {
            return true;
        }
        if (bases.length > 1) {
            for (var c = 1; c < bases.length; c++) {
                cls = bases[(typeof c === "number" && c < 0) ? bases.length + c : c];
                while (cls) {
                    if (q === cls) {
                        return true;
                    }
                    p = Object.getPrototypeOf(cls.prototype);
                    if (!p) {
                        break;
                    }
                    cls = p.constructor;
                }
            }
        }
    }
    return false;
};
ρσ_instanceof.__module__ = "__main__";
undefined;
function sum() {
    var iterable = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
    var start = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? sum.__defaults__.start : arguments[1];
    var ρσ_kwargs_obj = arguments[arguments.length-1];
    if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
    if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "start")){
        start = ρσ_kwargs_obj.start;
    }
    var ans, iterator, r;
    if (Array.isArray(iterable)) {
        function add(prev, cur) {
            return ρσ_operator_add(prev, cur);
        };
add.__argnames__ = ["prev", "cur"];
add.__module__ = "__main__";
undefined;

        return iterable.reduce(add, start);
    }
    ans = start;
    iterator = (iter?.__call__?.bind(iter) ?? iter)(iterable);
    r = iterator.next();
    while (!r.done) {
        ans = ρσ_operator_iadd(ans, r.value);
        r = iterator.next();
    }
    return ans;
};
sum.__defaults__ = {start:0};
sum.__handles_kwarg_interpolation__ = true;
sum.__argnames__ = ["iterable", "start"];
sum.__module__ = "__main__";
undefined;

function map() {
    var iterators, func, args, ans;
    iterators = new Array(ρσ_operator_sub(arguments.length, 1));
    func = arguments[0];
    args = new Array(ρσ_operator_sub(arguments.length, 1));
    for (var i = 1; i < arguments.length; i++) {
        iterators[ρσ_bound_index(ρσ_operator_sub(i, 1), iterators)] = (iter?.__call__?.bind(iter) ?? iter)(arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]);
    }
    ans = {'_func':func, '_iterators':iterators, '_args':args};
    ans[ρσ_iterator_symbol] = (function() {
        var ρσ_anonfunc = function () {
            return this;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans["next"] = (function() {
        var ρσ_anonfunc = function () {
            var r;
            for (var i = 0; i < this._iterators.length; i++) {
                r = (ρσ_expr_temp = this._iterators)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].next();
                if (r.done) {
                    return {'done':true};
                }
                (ρσ_expr_temp = this._args)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i] = r.value;
            }
            return {'done':false, 'value':this._func.apply(undefined, this._args)};
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    return ans;
};
map.__module__ = "__main__";
undefined;

function filter(func_or_none, iterable) {
    var func, ans;
    func = (func_or_none === null) ? ρσ_bool : func_or_none;
    ans = {'_func':func, '_iterator':ρσ_iter(iterable)};
    ans[ρσ_iterator_symbol] = (function() {
        var ρσ_anonfunc = function () {
            return this;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans["next"] = (function() {
        var ρσ_anonfunc = function () {
            var r;
            r = this._iterator.next();
            while (!r.done) {
                if (this._func(r.value)) {
                    return r;
                }
                r = this._iterator.next();
            }
            return {'done':true};
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    return ans;
};
filter.__argnames__ = ["func_or_none", "iterable"];
filter.__module__ = "__main__";
undefined;

function zip() {
    var iterators, ans;
    iterators = new Array(arguments.length);
    for (var i = 0; i < arguments.length; i++) {
        iterators[(typeof i === "number" && i < 0) ? iterators.length + i : i] = (iter?.__call__?.bind(iter) ?? iter)(arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]);
    }
    ans = {'_iterators':iterators};
    ans[ρσ_iterator_symbol] = (function() {
        var ρσ_anonfunc = function () {
            return this;
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    ans["next"] = (function() {
        var ρσ_anonfunc = function () {
            var args, r;
            args = new Array(this._iterators.length);
            for (var i = 0; i < this._iterators.length; i++) {
                r = (ρσ_expr_temp = this._iterators)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].next();
                if (r.done) {
                    return {'done':true};
                }
                args[(typeof i === "number" && i < 0) ? args.length + i : i] = r.value;
            }
            return {'done':false, 'value':args};
        };
ρσ_anonfunc.__module__ = "__main__";
undefined;
        return ρσ_anonfunc;
    })();
    return ans;
};
zip.__module__ = "__main__";
undefined;

function any(iterable) {
    var i;
    var ρσ_Iter0 = iterable;
    ρσ_Iter0 = ((typeof ρσ_Iter0[Symbol.iterator] === "function") ? (ρσ_Iter0 instanceof Map ? ρσ_Iter0.keys() : ρσ_Iter0) : Object.keys(ρσ_Iter0));
    for (var ρσ_Index0 of ρσ_Iter0) {
        i = ρσ_Index0;
        if (i) {
            return true;
        }
    }
    return false;
};
any.__argnames__ = ["iterable"];
any.__module__ = "__main__";
undefined;

function all(iterable) {
    var i;
    var ρσ_Iter1 = iterable;
    ρσ_Iter1 = ((typeof ρσ_Iter1[Symbol.iterator] === "function") ? (ρσ_Iter1 instanceof Map ? ρσ_Iter1.keys() : ρσ_Iter1) : Object.keys(ρσ_Iter1));
    for (var ρσ_Index1 of ρσ_Iter1) {
        i = ρσ_Index1;
        if (!i) {
            return false;
        }
    }
    return true;
};
all.__argnames__ = ["iterable"];
all.__module__ = "__main__";
undefined;
var decimal_sep, define_str_func, ρσ_unpack, ρσ_orig_split, ρσ_orig_replace;
decimal_sep = 1.1.toLocaleString()[1];
function ρσ_repr_js_builtin(x, as_array) {
    var ans, b, keys, key;
    ans = [];
    b = "{}";
    if (as_array) {
        b = "[]";
        for (var i = 0; i < x.length; i++) {
            ans.push((ρσ_repr?.__call__?.bind(ρσ_repr) ?? ρσ_repr)(x[(typeof i === "number" && i < 0) ? x.length + i : i]));
        }
    } else {
        keys = Object.keys(x);
        for (var k = 0; k < keys.length; k++) {
            key = keys[(typeof k === "number" && k < 0) ? keys.length + k : k];
            ans.push(ρσ_operator_add(ρσ_operator_add((ρσ_repr?.__call__?.bind(ρσ_repr) ?? ρσ_repr)(key), ": "), (ρσ_repr?.__call__?.bind(ρσ_repr) ?? ρσ_repr)(x[(typeof key === "number" && key < 0) ? x.length + key : key])));
        }
    }
    return ρσ_operator_add(ρσ_operator_add(b[0], ans.join(", ")), b[1]);
};
ρσ_repr_js_builtin.__argnames__ = ["x", "as_array"];
ρσ_repr_js_builtin.__module__ = "__main__";
undefined;

function ρσ_html_element_to_string(elem) {
    var attrs, val, attr, ans;
    attrs = [];
    var ρσ_Iter0 = elem.attributes;
    ρσ_Iter0 = ((typeof ρσ_Iter0[Symbol.iterator] === "function") ? (ρσ_Iter0 instanceof Map ? ρσ_Iter0.keys() : ρσ_Iter0) : Object.keys(ρσ_Iter0));
    for (var ρσ_Index0 of ρσ_Iter0) {
        attr = ρσ_Index0;
        if (attr.specified) {
            val = attr.value;
            if (val.length > 10) {
                val = ρσ_operator_add(val.slice(0, 15), "...");
            }
            val = JSON.stringify(val);
            attrs.push(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("", ρσ_str.format("{}", attr.name)), "="), ρσ_str.format("{}", val)), ""));
        }
    }
    attrs = (attrs.length) ? ρσ_operator_add(" ", attrs.join(" ")) : "";
    ans = ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("<", ρσ_str.format("{}", elem.tagName)), ""), ρσ_str.format("{}", attrs)), ">");
    return ans;
};
ρσ_html_element_to_string.__argnames__ = ["elem"];
ρσ_html_element_to_string.__module__ = "__main__";
undefined;

function ρσ_repr(x) {
    var ans, name;
    if (x === null) {
        return "None";
    }
    if (x === undefined) {
        return "undefined";
    }
    ans = x;
    if (typeof x.__repr__ === "function") {
        ans = x.__repr__();
    } else if (x === true || x === false) {
        ans = (x) ? "True" : "False";
    } else if (Array.isArray(x)) {
        ans = (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x, true);
    } else if (typeof x === "string") {
        ans = ρσ_operator_add(ρσ_operator_add("'", x), "'");
    } else if (typeof x === "function") {
        ans = x.toString();
    } else if (typeof x === "object" && !x.toString) {
        ans = (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x);
    } else {
        name = Object.prototype.toString.call(x).slice(8, -1);
        if (ρσ_not_equals("Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".indexOf(name), -1)) {
            return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(name, "(["), x.map((function() {
                var ρσ_anonfunc = function (i) {
                    return str.format("0x{:02x}", i);
                };
ρσ_anonfunc.__argnames__ = ["i"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })()).join(", ")), "])");
        }
        if (typeof HTMLElement !== "undefined" && x instanceof HTMLElement) {
            ans = (ρσ_html_element_to_string?.__call__?.bind(ρσ_html_element_to_string) ?? ρσ_html_element_to_string)(x);
        } else {
            ans = (typeof x.toString === "function") ? x.toString() : x;
        }
        if (ans === "[object Object]") {
            return (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x);
        }
        try {
            ans = JSON.stringify(x);
        } catch (ρσ_Exception) {
            ρσ_last_exception = ρσ_Exception;
            {
            } 
        }
    }
    return ρσ_operator_add(ans, "");
};
ρσ_repr.__argnames__ = ["x"];
ρσ_repr.__module__ = "__main__";
undefined;

function ρσ_str(x) {
    var ans, name;
    if (x === null) {
        return "None";
    }
    if (x === undefined) {
        return "undefined";
    }
    ans = x;
    if (typeof x.__str__ === "function") {
        ans = x.__str__();
    } else if (typeof x.__repr__ === "function") {
        ans = x.__repr__();
    } else if (x === true || x === false) {
        ans = (x) ? "True" : "False";
    } else if (Array.isArray(x)) {
        ans = (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x, true);
    } else if (typeof x.toString === "function") {
        name = Object.prototype.toString.call(x).slice(8, -1);
        if (ρσ_not_equals("Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".indexOf(name), -1)) {
            return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(name, "(["), x.map((function() {
                var ρσ_anonfunc = function (i) {
                    return str.format("0x{:02x}", i);
                };
ρσ_anonfunc.__argnames__ = ["i"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })()).join(", ")), "])");
        }
        if (typeof HTMLElement !== "undefined" && x instanceof HTMLElement) {
            ans = (ρσ_html_element_to_string?.__call__?.bind(ρσ_html_element_to_string) ?? ρσ_html_element_to_string)(x);
        } else {
            ans = x.toString();
        }
        if (ans === "[object Object]") {
            ans = (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x);
        }
    } else if (typeof x === "object" && !x.toString) {
        ans = (ρσ_repr_js_builtin?.__call__?.bind(ρσ_repr_js_builtin) ?? ρσ_repr_js_builtin)(x);
    }
    return ρσ_operator_add(ans, "");
};
ρσ_str.__argnames__ = ["x"];
ρσ_str.__module__ = "__main__";
undefined;

define_str_func = (function() {
    var ρσ_anonfunc = function (name, func) {
        var f;
        (ρσ_expr_temp = ρσ_str.prototype)[(typeof name === "number" && name < 0) ? ρσ_expr_temp.length + name : name] = func;
        ρσ_str[(typeof name === "number" && name < 0) ? ρσ_str.length + name : name] = f = func.call.bind(func);
        if (func.__argnames__) {
            Object.defineProperty(f, "__argnames__", {"value":['string'].concat(func.__argnames__)});
        }
    };
ρσ_anonfunc.__argnames__ = ["name", "func"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})();
ρσ_unpack = [String.prototype.split.call.bind(String.prototype.split), String.prototype.replace.call.bind(String.prototype.replace)];
ρσ_orig_split = ρσ_unpack[0];
ρσ_orig_replace = ρσ_unpack[1];
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("format", (function() {
    var ρσ_anonfunc = function () {
        var template, args, kwargs, explicit, implicit, idx, split, ans, pos, in_brace, markup, ch;
        template = this;
        if (template === undefined) {
            throw new TypeError("Template is required");
        }
        args = Array.prototype.slice.call(arguments);
        kwargs = {};
        if (args[args.length-1] && args[args.length-1][ρσ_kwargs_symbol] !== undefined) {
            kwargs = args[args.length-1];
            args = args.slice(0, -1);
        }
        explicit = implicit = false;
        idx = 0;
        split = ρσ_orig_split;
        if (ρσ_str.format._template_resolve_pat === undefined) {
            ρσ_str.format._template_resolve_pat = /[.\[]/;
        }
        function resolve(arg, object) {
            var ρσ_unpack, first, key, rest, ans;
            if (!arg) {
                return object;
            }
            ρσ_unpack = [arg[0], arg.slice(1)];
            first = ρσ_unpack[0];
            arg = ρσ_unpack[1];
            key = (split?.__call__?.bind(split) ?? split)(arg, ρσ_str.format._template_resolve_pat, 1)[0];
            rest = arg.slice(key.length);
            ans = (first === "[") ? object[ρσ_bound_index(key.slice(0, -1), object)] : (getattr?.__call__?.bind(getattr) ?? getattr)(object, key);
            if (ans === undefined) {
                throw new KeyError((first === "[") ? key.slice(0, -1) : key);
            }
            return (resolve?.__call__?.bind(resolve) ?? resolve)(rest, ans);
        };
resolve.__argnames__ = ["arg", "object"];
resolve.__module__ = "__main__";
undefined;

        function resolve_format_spec(format_spec) {
            if (ρσ_str.format._template_resolve_fs_pat === undefined) {
                ρσ_str.format._template_resolve_fs_pat = /[{]([a-zA-Z0-9_]+)[}]/g;
            }
            return format_spec.replace(ρσ_str.format._template_resolve_fs_pat, (function() {
                var ρσ_anonfunc = function (match, key) {
                    if (!Object.prototype.hasOwnProperty.call(kwargs, key)) {
                        return "";
                    }
                    return ρσ_operator_add("", kwargs[(typeof key === "number" && key < 0) ? kwargs.length + key : key]);
                };
ρσ_anonfunc.__argnames__ = ["match", "key"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
                return ρσ_anonfunc;
            })());
        };
resolve_format_spec.__argnames__ = ["format_spec"];
resolve_format_spec.__module__ = "__main__";
undefined;

        function set_comma(ans, comma) {
            var sep;
            if (comma !== ",") {
                sep = 1234;
                sep = sep.toLocaleString(undefined, {useGrouping: true})[1];
                ans = str.replace(ans, sep, comma);
            }
            return ans;
        };
set_comma.__argnames__ = ["ans", "comma"];
set_comma.__module__ = "__main__";
undefined;

        function safe_comma(value, comma) {
            try {
                return (set_comma?.__call__?.bind(set_comma) ?? set_comma)(value.toLocaleString(undefined, {useGrouping: true}), comma);
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                {
                    return value.toString(10);
                } 
            }
        };
safe_comma.__argnames__ = ["value", "comma"];
safe_comma.__module__ = "__main__";
undefined;

        function safe_fixed(value, precision, comma) {
            if (!comma) {
                return value.toFixed(precision);
            }
            try {
                return (set_comma?.__call__?.bind(set_comma) ?? set_comma)(value.toLocaleString(undefined, {useGrouping: true, minimumFractionDigits: precision, maximumFractionDigits: precision}), comma);
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                {
                    return value.toFixed(precision);
                } 
            }
        };
safe_fixed.__argnames__ = ["value", "precision", "comma"];
safe_fixed.__module__ = "__main__";
undefined;

        function apply_formatting(value, format_spec) {
            var ρσ_unpack, fill, align, sign, fhash, zeropad, width, comma, precision, ftype, is_numeric, is_int, lftype, code, prec, exp, nval, is_positive, left, right;
            if (format_spec.indexOf("{") !== -1) {
                format_spec = (resolve_format_spec?.__call__?.bind(resolve_format_spec) ?? resolve_format_spec)(format_spec);
            }
            if (ρσ_str.format._template_format_pat === undefined) {
                ρσ_str.format._template_format_pat = /([^{}](?=[<>=^]))?([<>=^])?([-+\x20])?(\#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?/;
            }
            try {
                ρσ_unpack = format_spec.match(ρσ_str.format._template_format_pat).slice(1);
ρσ_unpack = ρσ_unpack_asarray(9, ρσ_unpack);
                fill = ρσ_unpack[0];
                align = ρσ_unpack[1];
                sign = ρσ_unpack[2];
                fhash = ρσ_unpack[3];
                zeropad = ρσ_unpack[4];
                width = ρσ_unpack[5];
                comma = ρσ_unpack[6];
                precision = ρσ_unpack[7];
                ftype = ρσ_unpack[8];
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                if (ρσ_Exception instanceof TypeError) {
                    return value;
                } else {
                    throw ρσ_Exception;
                }
            }
            if (zeropad) {
                fill = fill || "0";
                align = align || "=";
            } else {
                fill = fill || " ";
                align = align || ">";
            }
            is_numeric = Number(value) === value;
            is_int = is_numeric && value % 1 === 0;
            precision = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(precision, 10);
            lftype = (ftype || "").toLowerCase();
            if (ftype === "n") {
                is_numeric = true;
                if (is_int) {
                    if (comma) {
                        throw new ValueError("Cannot specify ',' with 'n'");
                    }
                    value = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(value, 10).toLocaleString();
                } else {
                    value = (parseFloat?.__call__?.bind(parseFloat) ?? parseFloat)(value).toLocaleString();
                }
            } else if (['b', 'c', 'd', 'o', 'x'].indexOf(lftype) !== -1) {
                value = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(value, 10);
                is_numeric = true;
                if (!(isNaN?.__call__?.bind(isNaN) ?? isNaN)(value)) {
                    if (ftype === "b") {
                        value = (value >>> 0).toString(2);
                        if (fhash) {
                            value = ρσ_operator_add("0b", value);
                        }
                    } else if (ftype === "c") {
                        if (value > 65535) {
                            code = ρσ_operator_sub(value, 65536);
                            value = String.fromCharCode(ρσ_operator_add(55296, (code >> 10)), ρσ_operator_add(56320, (code & 1023)));
                        } else {
                            value = String.fromCharCode(value);
                        }
                    } else if (ftype === "d") {
                        if (comma) {
                            value = (safe_comma?.__call__?.bind(safe_comma) ?? safe_comma)(value, comma);
                        } else {
                            value = value.toString(10);
                        }
                    } else if (ftype === "o") {
                        value = value.toString(8);
                        if (fhash) {
                            value = ρσ_operator_add("0o", value);
                        }
                    } else if (lftype === "x") {
                        value = value.toString(16);
                        value = (ftype === "x") ? value.toLowerCase() : value.toUpperCase();
                        if (fhash) {
                            value = ρσ_operator_add("0x", value);
                        }
                    }
                }
            } else if (['e','f','g','%'].indexOf(lftype) !== -1) {
                is_numeric = true;
                value = (parseFloat?.__call__?.bind(parseFloat) ?? parseFloat)(value);
                prec = ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(precision)) ? 6 : precision;
                if (lftype === "e") {
                    value = value.toExponential(prec);
                    value = (ftype === "E") ? value.toUpperCase() : value.toLowerCase();
                } else if (lftype === "f") {
                    value = (safe_fixed?.__call__?.bind(safe_fixed) ?? safe_fixed)(value, prec, comma);
                    value = (ftype === "F") ? value.toUpperCase() : value.toLowerCase();
                } else if (lftype === "%") {
                    value = ρσ_operator_imul(value, 100);
                    value = ρσ_operator_add((safe_fixed?.__call__?.bind(safe_fixed) ?? safe_fixed)(value, prec, comma), "%");
                } else if (lftype === "g") {
                    prec = (max?.__call__?.bind(max) ?? max)(1, prec);
                    exp = (parseInt?.__call__?.bind(parseInt) ?? parseInt)((split?.__call__?.bind(split) ?? split)(value.toExponential(ρσ_operator_sub(prec, 1)).toLowerCase(), "e")[1], 10);
                    if (-4 <= exp && exp < prec) {
                        value = (safe_fixed?.__call__?.bind(safe_fixed) ?? safe_fixed)(value, ρσ_operator_sub(ρσ_operator_sub(prec, 1), exp), comma);
                    } else {
                        value = value.toExponential(ρσ_operator_sub(prec, 1));
                    }
                    value = value.replace(/0+$/g, "");
                    if (value[value.length-1] === decimal_sep) {
                        value = value.slice(0, -1);
                    }
                    if (ftype === "G") {
                        value = value.toUpperCase();
                    }
                }
            } else {
                if (comma) {
                    value = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(value, 10);
                    if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(value)) {
                        throw new ValueError("Must use numbers with , or _");
                    }
                    value = (safe_comma?.__call__?.bind(safe_comma) ?? safe_comma)(value, comma);
                }
                value = ρσ_operator_iadd(value, "");
                if (!(isNaN?.__call__?.bind(isNaN) ?? isNaN)(precision)) {
                    value = value.slice(0, precision);
                }
            }
            value = ρσ_operator_iadd(value, "");
            if (is_numeric && sign) {
                nval = Number(value);
                is_positive = !(isNaN?.__call__?.bind(isNaN) ?? isNaN)(nval) && nval >= 0;
                if (is_positive && (sign === " " || sign === "+")) {
                    value = ρσ_operator_add(sign, value);
                }
            }
            function repeat(char, num) {
                return (new Array(num+1)).join(char);
            };
repeat.__argnames__ = ["char", "num"];
repeat.__module__ = "__main__";
undefined;

            if (is_numeric && width && width[0] === "0") {
                width = width.slice(1);
                ρσ_unpack = ["0", "="];
                fill = ρσ_unpack[0];
                align = ρσ_unpack[1];
            }
            width = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(width || "-1", 10);
            if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(width)) {
                throw new ValueError(ρσ_operator_add("Invalid width specification: ", width));
            }
            if (fill && value.length < width) {
                if (align === "<") {
                    value = ρσ_operator_add(value, (repeat?.__call__?.bind(repeat) ?? repeat)(fill, ρσ_operator_sub(width, value.length)));
                } else if (align === ">") {
                    value = ρσ_operator_add((repeat?.__call__?.bind(repeat) ?? repeat)(fill, ρσ_operator_sub(width, value.length)), value);
                } else if (align === "^") {
                    left = ρσ_operator_floordiv((ρσ_operator_sub(width, value.length)), 2);
                    right = ρσ_operator_sub(ρσ_operator_sub(width, left), value.length);
                    value = ρσ_operator_add(ρσ_operator_add((repeat?.__call__?.bind(repeat) ?? repeat)(fill, left), value), (repeat?.__call__?.bind(repeat) ?? repeat)(fill, right));
                } else if (align === "=") {
                    if (ρσ_in(value[0], "+- ")) {
                        value = ρσ_operator_add(ρσ_operator_add(value[0], (repeat?.__call__?.bind(repeat) ?? repeat)(fill, ρσ_operator_sub(width, value.length))), value.slice(1));
                    } else {
                        value = ρσ_operator_add((repeat?.__call__?.bind(repeat) ?? repeat)(fill, ρσ_operator_sub(width, value.length)), value);
                    }
                } else {
                    throw new ValueError(ρσ_operator_add("Unrecognized alignment: ", align));
                }
            }
            return value;
        };
apply_formatting.__argnames__ = ["value", "format_spec"];
apply_formatting.__module__ = "__main__";
undefined;

        function parse_markup(markup) {
            var key, transformer, format_spec, pos, state, ch;
            key = transformer = format_spec = "";
            pos = 0;
            state = 0;
            while (pos < markup.length) {
                ch = markup[(typeof pos === "number" && pos < 0) ? markup.length + pos : pos];
                if (state === 0) {
                    if (ch === "!") {
                        state = 1;
                    } else if (ch === ":") {
                        state = 2;
                    } else {
                        key = ρσ_operator_iadd(key, ch);
                    }
                } else if (state === 1) {
                    if (ch === ":") {
                        state = 2;
                    } else {
                        transformer = ρσ_operator_iadd(transformer, ch);
                    }
                } else {
                    format_spec = ρσ_operator_iadd(format_spec, ch);
                }
                pos = ρσ_operator_iadd(pos, 1);
            }
            return [key, transformer, format_spec];
        };
parse_markup.__argnames__ = ["markup"];
parse_markup.__module__ = "__main__";
undefined;

        function render_markup(markup) {
            var ρσ_unpack, key, transformer, format_spec, ends_with_equal, lkey, nvalue, object, ans;
            ρσ_unpack = (parse_markup?.__call__?.bind(parse_markup) ?? parse_markup)(markup);
ρσ_unpack = ρσ_unpack_asarray(3, ρσ_unpack);
            key = ρσ_unpack[0];
            transformer = ρσ_unpack[1];
            format_spec = ρσ_unpack[2];
            if (transformer && ['a', 'r', 's'].indexOf(transformer) === -1) {
                throw new ValueError(ρσ_operator_add("Unknown conversion specifier: ", transformer));
            }
            ends_with_equal = key.endsWith("=");
            if (ends_with_equal) {
                key = key.slice(0, -1);
            }
            lkey = key.length && (split?.__call__?.bind(split) ?? split)(key, /[.\[]/, 1)[0];
            if (lkey) {
                explicit = true;
                if (implicit) {
                    throw new ValueError("cannot switch from automatic field numbering to manual field specification");
                }
                nvalue = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(lkey);
                object = ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(nvalue)) ? kwargs[(typeof lkey === "number" && lkey < 0) ? kwargs.length + lkey : lkey] : args[(typeof nvalue === "number" && nvalue < 0) ? args.length + nvalue : nvalue];
                if (object === undefined) {
                    if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(nvalue)) {
                        throw new KeyError(lkey);
                    }
                    throw new IndexError(lkey);
                }
                object = (resolve?.__call__?.bind(resolve) ?? resolve)(key.slice(lkey.length), object);
            } else {
                implicit = true;
                if (explicit) {
                    throw new ValueError("cannot switch from manual field specification to automatic field numbering");
                }
                if (idx >= args.length) {
                    throw new IndexError(ρσ_operator_add("Not enough arguments to match template: ", template));
                }
                object = args[(typeof idx === "number" && idx < 0) ? args.length + idx : idx];
                idx = ρσ_operator_iadd(idx, 1);
            }
            if (typeof object === "function") {
                object = (object?.__call__?.bind(object) ?? object)();
            }
            ans = ρσ_operator_add("", object);
            if (format_spec) {
                ans = (apply_formatting?.__call__?.bind(apply_formatting) ?? apply_formatting)(ans, format_spec);
            }
            if (ends_with_equal) {
                ans = ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("", ρσ_str.format("{}", key)), "="), ρσ_str.format("{}", ans)), "");
            }
            return ans;
        };
render_markup.__argnames__ = ["markup"];
render_markup.__module__ = "__main__";
undefined;

        ans = "";
        pos = 0;
        in_brace = 0;
        markup = "";
        while (pos < template.length) {
            ch = template[(typeof pos === "number" && pos < 0) ? template.length + pos : pos];
            if (in_brace) {
                if (ch === "{") {
                    in_brace = ρσ_operator_iadd(in_brace, 1);
                    markup = ρσ_operator_iadd(markup, "{");
                } else if (ch === "}") {
                    in_brace = ρσ_operator_isub(in_brace, 1);
                    if (in_brace > 0) {
                        markup = ρσ_operator_iadd(markup, "}");
                    } else {
                        ans = ρσ_operator_iadd(ans, (render_markup?.__call__?.bind(render_markup) ?? render_markup)(markup));
                    }
                } else {
                    markup = ρσ_operator_iadd(markup, ch);
                }
            } else {
                if (ch === "{") {
                    if (template[ρσ_bound_index(ρσ_operator_add(pos, 1), template)] === "{") {
                        pos = ρσ_operator_iadd(pos, 1);
                        ans = ρσ_operator_iadd(ans, "{");
                    } else {
                        in_brace = 1;
                        markup = "";
                    }
                } else {
                    ans = ρσ_operator_iadd(ans, ch);
                    if (ch === "}" && template[ρσ_bound_index(ρσ_operator_add(pos, 1), template)] === "}") {
                        pos = ρσ_operator_iadd(pos, 1);
                    }
                }
            }
            pos = ρσ_operator_iadd(pos, 1);
        }
        if (in_brace) {
            throw new ValueError("expected '}' before end of string");
        }
        return ans;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("capitalize", (function() {
    var ρσ_anonfunc = function () {
        var string;
        string = this;
        if (string) {
            string = ρσ_operator_add(string[0].toUpperCase(), string.slice(1).toLowerCase());
        }
        return string;
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("center", (function() {
    var ρσ_anonfunc = function (width, fill) {
        var left, right;
        left = ρσ_operator_floordiv((ρσ_operator_sub(width, this.length)), 2);
        right = ρσ_operator_sub(ρσ_operator_sub(width, left), this.length);
        fill = fill || " ";
        return ρσ_operator_add(ρσ_operator_add(new Array(left+1).join(fill), this), new Array(right+1).join(fill));
    };
ρσ_anonfunc.__argnames__ = ["width", "fill"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("count", (function() {
    var ρσ_anonfunc = function (needle, start, end) {
        var string, ρσ_unpack, pos, step, ans;
        string = this;
        start = start || 0;
        end = end || string.length;
        if (start < 0 || end < 0) {
            string = string.slice(start, end);
            ρσ_unpack = [0, string.length];
            start = ρσ_unpack[0];
            end = ρσ_unpack[1];
        }
        pos = start;
        step = needle.length;
        if (!step) {
            return 0;
        }
        ans = 0;
        while (pos !== -1) {
            pos = string.indexOf(needle, pos);
            if (pos !== -1) {
                ans = ρσ_operator_iadd(ans, 1);
                pos = ρσ_operator_iadd(pos, step);
            }
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["needle", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("endswith", (function() {
    var ρσ_anonfunc = function (suffixes, start, end) {
        var string, q;
        string = this;
        start = start || 0;
        if (typeof suffixes === "string") {
            suffixes = [suffixes];
        }
        if (end !== undefined) {
            string = string.slice(0, end);
        }
        for (var i = 0; i < suffixes.length; i++) {
            q = suffixes[(typeof i === "number" && i < 0) ? suffixes.length + i : i];
            if (string.indexOf(q, Math.max(start, ρσ_operator_sub(string.length, q.length))) !== -1) {
                return true;
            }
        }
        return false;
    };
ρσ_anonfunc.__argnames__ = ["suffixes", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("startswith", (function() {
    var ρσ_anonfunc = function (prefixes, start, end) {
        var prefix;
        start = start || 0;
        if (typeof prefixes === "string") {
            prefixes = [prefixes];
        }
        for (var i = 0; i < prefixes.length; i++) {
            prefix = prefixes[(typeof i === "number" && i < 0) ? prefixes.length + i : i];
            end = (end === undefined) ? this.length : end;
            if (ρσ_operator_sub(end, start) >= prefix.length && prefix === this.slice(start, ρσ_operator_add(start, prefix.length))) {
                return true;
            }
        }
        return false;
    };
ρσ_anonfunc.__argnames__ = ["prefixes", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("find", (function() {
    var ρσ_anonfunc = function (needle, start, end) {
        var ans;
        while (start < 0) {
            start = ρσ_operator_iadd(start, this.length);
        }
        ans = this.indexOf(needle, start);
        if (end !== undefined && ans !== -1) {
            while (end < 0) {
                end = ρσ_operator_iadd(end, this.length);
            }
            if (ans >= ρσ_operator_sub(end, needle.length)) {
                return -1;
            }
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["needle", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rfind", (function() {
    var ρσ_anonfunc = function (needle, start, end) {
        var ans;
        while (end < 0) {
            end = ρσ_operator_iadd(end, this.length);
        }
        ans = this.lastIndexOf(needle, ρσ_operator_sub(end, 1));
        if (start !== undefined && ans !== -1) {
            while (start < 0) {
                start = ρσ_operator_iadd(start, this.length);
            }
            if (ans < start) {
                return -1;
            }
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["needle", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("index", (function() {
    var ρσ_anonfunc = function (needle, start, end) {
        var ans;
        ans = ρσ_str.prototype.find.apply(this, arguments);
        if (ans === -1) {
            throw new ValueError("substring not found");
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["needle", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rindex", (function() {
    var ρσ_anonfunc = function (needle, start, end) {
        var ans;
        ans = ρσ_str.prototype.rfind.apply(this, arguments);
        if (ans === -1) {
            throw new ValueError("substring not found");
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["needle", "start", "end"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("islower", (function() {
    var ρσ_anonfunc = function () {
        return this.length > 0 && this.toLowerCase() === this.toString();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("isupper", (function() {
    var ρσ_anonfunc = function () {
        return this.length > 0 && this.toUpperCase() === this.toString();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("isspace", (function() {
    var ρσ_anonfunc = function () {
        return this.length > 0 && /^\s+$/.test(this);
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("join", (function() {
    var ρσ_anonfunc = function (iterable) {
        var ans, r;
        if (Array.isArray(iterable)) {
            return iterable.join(this);
        }
        ans = "";
        r = iterable.next();
        while (!r.done) {
            if (ans) {
                ans = ρσ_operator_iadd(ans, this);
            }
            ans = ρσ_operator_iadd(ans, r.value);
            r = iterable.next();
        }
        return ans;
    };
ρσ_anonfunc.__argnames__ = ["iterable"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("ljust", (function() {
    var ρσ_anonfunc = function (width, fill) {
        var string;
        string = this;
        if (width > string.length) {
            fill = fill || " ";
            string = ρσ_operator_iadd(string, new Array(width - string.length + 1).join(fill));
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["width", "fill"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rjust", (function() {
    var ρσ_anonfunc = function (width, fill) {
        var string;
        string = this;
        if (width > string.length) {
            fill = fill || " ";
            string = ρσ_operator_add(new Array(width - string.length + 1).join(fill), string);
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["width", "fill"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("lower", (function() {
    var ρσ_anonfunc = function () {
        return this.toLowerCase();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("upper", (function() {
    var ρσ_anonfunc = function () {
        return this.toUpperCase();
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("lstrip", (function() {
    var ρσ_anonfunc = function (chars) {
        var string, pos;
        string = this;
        pos = 0;
        chars = chars || ρσ_str.whitespace;
        while (chars.indexOf(string[(typeof pos === "number" && pos < 0) ? string.length + pos : pos]) !== -1) {
            pos = ρσ_operator_iadd(pos, 1);
        }
        if (pos) {
            string = string.slice(pos);
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["chars"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rstrip", (function() {
    var ρσ_anonfunc = function (chars) {
        var string, pos;
        string = this;
        pos = ρσ_operator_sub(string.length, 1);
        chars = chars || ρσ_str.whitespace;
        while (chars.indexOf(string[(typeof pos === "number" && pos < 0) ? string.length + pos : pos]) !== -1) {
            pos = ρσ_operator_isub(pos, 1);
        }
        if (pos < ρσ_operator_sub(string.length, 1)) {
            string = string.slice(0, ρσ_operator_add(pos, 1));
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["chars"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("strip", (function() {
    var ρσ_anonfunc = function (chars) {
        return ρσ_str.prototype.lstrip.call(ρσ_str.prototype.rstrip.call(this, chars), chars);
    };
ρσ_anonfunc.__argnames__ = ["chars"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("partition", (function() {
    var ρσ_anonfunc = function (sep) {
        var idx;
        idx = this.indexOf(sep);
        if (idx === -1) {
            return [this, "", ""];
        }
        return [this.slice(0, idx), sep, this.slice(ρσ_operator_add(idx, sep.length))];
    };
ρσ_anonfunc.__argnames__ = ["sep"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rpartition", (function() {
    var ρσ_anonfunc = function (sep) {
        var idx;
        idx = this.lastIndexOf(sep);
        if (idx === -1) {
            return ["", "", this];
        }
        return [this.slice(0, idx), sep, this.slice(ρσ_operator_add(idx, sep.length))];
    };
ρσ_anonfunc.__argnames__ = ["sep"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("replace", (function() {
    var ρσ_anonfunc = function (old, repl, count) {
        var string, pos, idx;
        string = this;
        if (count === 1) {
            return (ρσ_orig_replace?.__call__?.bind(ρσ_orig_replace) ?? ρσ_orig_replace)(string, old, repl);
        }
        if (count < 1) {
            return string;
        }
        count = count || Number.MAX_VALUE;
        pos = 0;
        while (count > 0) {
            count = ρσ_operator_isub(count, 1);
            idx = string.indexOf(old, pos);
            if (idx === -1) {
                break;
            }
            pos = ρσ_operator_add(idx, repl.length);
            string = ρσ_operator_add(ρσ_operator_add(string.slice(0, idx), repl), string.slice(ρσ_operator_add(idx, old.length)));
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["old", "repl", "count"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("split", (function() {
    var ρσ_anonfunc = function (sep, maxsplit) {
        var split, ans, extra, parts;
        if (maxsplit === 0) {
            return ρσ_list_decorate([ this ]);
        }
        split = ρσ_orig_split;
        if (sep === undefined || sep === null) {
            if (maxsplit > 0) {
                ans = (split?.__call__?.bind(split) ?? split)(this, /(\s+)/);
                extra = "";
                parts = [];
                for (var i = 0; i < ans.length; i++) {
                    if (parts.length >= ρσ_operator_add(maxsplit, 1)) {
                        extra = ρσ_operator_iadd(extra, ans[(typeof i === "number" && i < 0) ? ans.length + i : i]);
                    } else if (i % 2 === 0) {
                        parts.push(ans[(typeof i === "number" && i < 0) ? ans.length + i : i]);
                    }
                }
                parts[parts.length-1] = ρσ_operator_iadd(parts[parts.length-1], extra);
                ans = parts;
            } else {
                ans = (split?.__call__?.bind(split) ?? split)(this, /\s+/);
            }
        } else {
            if (sep === "") {
                throw new ValueError("empty separator");
            }
            ans = (split?.__call__?.bind(split) ?? split)(this, sep);
            if (maxsplit > 0 && ans.length > maxsplit) {
                extra = ans.slice(maxsplit).join(sep);
                ans = ans.slice(0, maxsplit);
                ans.push(extra);
            }
        }
        return (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
    };
ρσ_anonfunc.__argnames__ = ["sep", "maxsplit"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("rsplit", (function() {
    var ρσ_anonfunc = function (sep, maxsplit) {
        var split, ans, is_space, pos, current, spc, ch, end, idx;
        if (!maxsplit) {
            return ρσ_str.prototype.split.call(this, sep);
        }
        split = ρσ_orig_split;
        if (sep === undefined || sep === null) {
            if (maxsplit > 0) {
                ans = [];
                is_space = /\s/;
                pos = ρσ_operator_sub(this.length, 1);
                current = "";
                while (pos > -1 && maxsplit > 0) {
                    spc = false;
                    ch = (ρσ_expr_temp = this)[(typeof pos === "number" && pos < 0) ? ρσ_expr_temp.length + pos : pos];
                    while (pos > -1 && is_space.test(ch)) {
                        spc = true;
                        ch = this[--pos];
                    }
                    if (spc) {
                        if (current) {
                            ans.push(current);
                            maxsplit = ρσ_operator_isub(maxsplit, 1);
                        }
                        current = ch;
                    } else {
                        current = ρσ_operator_iadd(current, ch);
                    }
                    pos = ρσ_operator_isub(pos, 1);
                }
                ans.push(ρσ_operator_add(this.slice(0, ρσ_operator_add(pos, 1)), current));
                ans.reverse();
            } else {
                ans = (split?.__call__?.bind(split) ?? split)(this, /\s+/);
            }
        } else {
            if (sep === "") {
                throw new ValueError("empty separator");
            }
            ans = [];
            pos = end = this.length;
            while (pos > -1 && maxsplit > 0) {
                maxsplit = ρσ_operator_isub(maxsplit, 1);
                idx = this.lastIndexOf(sep, pos);
                if (idx === -1) {
                    break;
                }
                ans.push(this.slice(ρσ_operator_add(idx, sep.length), end));
                pos = ρσ_operator_sub(idx, 1);
                end = idx;
            }
            ans.push(this.slice(0, end));
            ans.reverse();
        }
        return (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
    };
ρσ_anonfunc.__argnames__ = ["sep", "maxsplit"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("splitlines", (function() {
    var ρσ_anonfunc = function (keepends) {
        var split, parts, ans;
        split = ρσ_orig_split;
        if (keepends) {
            parts = (split?.__call__?.bind(split) ?? split)(this, /((?:\r?\n)|\r)/);
            ans = [];
            for (var i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                    ans.push(parts[(typeof i === "number" && i < 0) ? parts.length + i : i]);
                } else {
                    ans[ans.length-1] = ρσ_operator_iadd(ans[ans.length-1], parts[(typeof i === "number" && i < 0) ? parts.length + i : i]);
                }
            }
        } else {
            ans = (split?.__call__?.bind(split) ?? split)(this, /(?:\r?\n)|\r/);
        }
        return (ρσ_list_decorate?.__call__?.bind(ρσ_list_decorate) ?? ρσ_list_decorate)(ans);
    };
ρσ_anonfunc.__argnames__ = ["keepends"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("swapcase", (function() {
    var ρσ_anonfunc = function () {
        var ans, a, b;
        ans = new Array(this.length);
        for (var i = 0; i < ans.length; i++) {
            a = (ρσ_expr_temp = this)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
            b = a.toLowerCase();
            if (a === b) {
                b = a.toUpperCase();
            }
            ans[(typeof i === "number" && i < 0) ? ans.length + i : i] = b;
        }
        return ans.join("");
    };
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
(define_str_func?.__call__?.bind(define_str_func) ?? define_str_func)("zfill", (function() {
    var ρσ_anonfunc = function (width) {
        var string;
        string = this;
        if (width > string.length) {
            string = ρσ_operator_add(new Array(width - string.length + 1).join("0"), string);
        }
        return string;
    };
ρσ_anonfunc.__argnames__ = ["width"];
ρσ_anonfunc.__module__ = "__main__";
undefined;
    return ρσ_anonfunc;
})());
ρσ_str.ascii_lowercase = "abcdefghijklmnopqrstuvwxyz";
ρσ_str.ascii_uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
ρσ_str.ascii_letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
ρσ_str.digits = "0123456789";
ρσ_str.punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
ρσ_str.printable = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\u000b\f";
ρσ_str.whitespace = " \t\n\r\u000b\f";
define_str_func = undefined;
var str = ρσ_str, repr = ρσ_repr;;
    var ρσ_modules = {};
    ρσ_modules.utils = {};
    ρσ_modules.errors = {};
    ρσ_modules.unicode_aliases = {};
    ρσ_modules.js = {};
    ρσ_modules.ast_types = {};
    ρσ_modules.string_interpolation = {};
    ρσ_modules.tokenizer = {};
    ρσ_modules.parse = {};
    ρσ_modules.output = {};
    ρσ_modules["output.stream"] = {};
    ρσ_modules["output.statements"] = {};
    ρσ_modules["output.exceptions"] = {};
    ρσ_modules["output.utils"] = {};
    ρσ_modules["output.loops"] = {};
    ρσ_modules["output.operators"] = {};
    ρσ_modules["output.functions"] = {};
    ρσ_modules["output.classes"] = {};
    ρσ_modules["output.literals"] = {};
    ρσ_modules["output.comments"] = {};
    ρσ_modules["output.modules"] = {};
    ρσ_modules["output.codegen"] = {};

    (function(){
        var __name__ = "utils";
        var has_prop;
        function array_to_hash(a) {
            var ret, i;
            ret = Object.create(null);
            var ρσ_Iter0 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(a));
            ρσ_Iter0 = ((typeof ρσ_Iter0[Symbol.iterator] === "function") ? (ρσ_Iter0 instanceof Map ? ρσ_Iter0.keys() : ρσ_Iter0) : Object.keys(ρσ_Iter0));
            for (var ρσ_Index0 of ρσ_Iter0) {
                i = ρσ_Index0;
                ret[ρσ_bound_index(a[(typeof i === "number" && i < 0) ? a.length + i : i], ret)] = true;
            }
            return ret;
        };
array_to_hash.__argnames__ = ["a"];
array_to_hash.__module__ = "utils";
undefined;

        function characters(str_) {
            return str_.split("");
        };
characters.__argnames__ = ["str_"];
characters.__module__ = "utils";
undefined;

        function repeat_string(str_, i) {
            var d;
            if (i <= 0) {
                return "";
            }
            if (i === 1) {
                return str_;
            }
            d = (repeat_string?.__call__?.bind(repeat_string) ?? repeat_string)(str_, i >> 1);
            d = ρσ_operator_iadd(d, d);
            if (i & 1) {
                d = ρσ_operator_iadd(d, str_);
            }
            return d;
        };
repeat_string.__argnames__ = ["str_", "i"];
repeat_string.__module__ = "utils";
undefined;

        function DefaultsError() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            DefaultsError.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(DefaultsError, ValueError);
        DefaultsError.prototype.__init__ = function __init__(name, defs) {
            var self = this;
            ValueError.prototype.__init__.call(self, ρσ_operator_add(ρσ_operator_add(name, " is not a supported option. Supported options are: "), (str?.__call__?.bind(str) ?? str)(Object.keys(defs))));
        };
DefaultsError.prototype.__init__.__argnames__ = ["name", "defs"];
DefaultsError.prototype.__init__.__module__ = "utils";
undefined;
        DefaultsError.__argnames__ = DefaultsError.prototype.__init__.__argnames__;
        DefaultsError.__handles_kwarg_interpolation__ = DefaultsError.prototype.__init__.__handles_kwarg_interpolation__;
        DefaultsError.prototype.__repr__ = function __repr__ () {
            if(ValueError.prototype.__repr__) return ValueError.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        DefaultsError.prototype.__str__ = function __str__ () {
            if(ValueError.prototype.__str__) return ValueError.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(DefaultsError.prototype, "__bases__", {value: [ValueError]});

        has_prop = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);
        function defaults(args, defs, croak) {
            var ret, i;
            if (args === true) {
                args = Object.create(null);
            }
            ret = args || Object.create(null);
            if (croak) {
                var ρσ_Iter1 = ret;
                ρσ_Iter1 = ((typeof ρσ_Iter1[Symbol.iterator] === "function") ? (ρσ_Iter1 instanceof Map ? ρσ_Iter1.keys() : ρσ_Iter1) : Object.keys(ρσ_Iter1));
                for (var ρσ_Index1 of ρσ_Iter1) {
                    i = ρσ_Index1;
                    if (!(has_prop?.__call__?.bind(has_prop) ?? has_prop)(defs, i)) {
                        throw new DefaultsError(i, defs);
                    }
                }
            }
            var ρσ_Iter2 = defs;
            ρσ_Iter2 = ((typeof ρσ_Iter2[Symbol.iterator] === "function") ? (ρσ_Iter2 instanceof Map ? ρσ_Iter2.keys() : ρσ_Iter2) : Object.keys(ρσ_Iter2));
            for (var ρσ_Index2 of ρσ_Iter2) {
                i = ρσ_Index2;
                ret[(typeof i === "number" && i < 0) ? ret.length + i : i] = (args && (has_prop?.__call__?.bind(has_prop) ?? has_prop)(args, i)) ? args[(typeof i === "number" && i < 0) ? args.length + i : i] : defs[(typeof i === "number" && i < 0) ? defs.length + i : i];
            }
            return ret;
        };
defaults.__argnames__ = ["args", "defs", "croak"];
defaults.__module__ = "utils";
undefined;

        function merge(obj, ext) {
            var i;
            var ρσ_Iter3 = ext;
            ρσ_Iter3 = ((typeof ρσ_Iter3[Symbol.iterator] === "function") ? (ρσ_Iter3 instanceof Map ? ρσ_Iter3.keys() : ρσ_Iter3) : Object.keys(ρσ_Iter3));
            for (var ρσ_Index3 of ρσ_Iter3) {
                i = ρσ_Index3;
                obj[(typeof i === "number" && i < 0) ? obj.length + i : i] = ext[(typeof i === "number" && i < 0) ? ext.length + i : i];
            }
            return obj;
        };
merge.__argnames__ = ["obj", "ext"];
merge.__module__ = "utils";
undefined;

        function noop() {
        };
noop.__module__ = "utils";
undefined;

        function push_uniq(array, el) {
            if (!array.includes(el)) {
                array.push(el);
            }
        };
push_uniq.__argnames__ = ["array", "el"];
push_uniq.__module__ = "utils";
undefined;

        function string_template(text, props) {
            function f(str_, p) {
                return props[(typeof p === "number" && p < 0) ? props.length + p : p];
            };
f.__argnames__ = ["str_", "p"];
f.__module__ = "utils";
undefined;

            return text.replace(/\{(.+?)\}/g, f);
        };
string_template.__argnames__ = ["text", "props"];
string_template.__module__ = "utils";
undefined;

        function make_predicate(words) {
            var a, k;
            if (ρσ_instanceof(words, str)) {
                words = words.split(" ");
            }
            a = Object.create(null);
            var ρσ_Iter4 = words;
            ρσ_Iter4 = ((typeof ρσ_Iter4[Symbol.iterator] === "function") ? (ρσ_Iter4 instanceof Map ? ρσ_Iter4.keys() : ρσ_Iter4) : Object.keys(ρσ_Iter4));
            for (var ρσ_Index4 of ρσ_Iter4) {
                k = ρσ_Index4;
                a[(typeof k === "number" && k < 0) ? a.length + k : k] = true;
            }
            return a;
        };
make_predicate.__argnames__ = ["words"];
make_predicate.__module__ = "utils";
undefined;

        function cache_file_name(src, cache_dir) {
            if (cache_dir) {
                src = str.replace(src, "\\", "/");
                return ρσ_operator_add(ρσ_operator_add(cache_dir, "/"), str.lstrip(ρσ_operator_add(str.replace(src, "/", "-"), ".json"), "-"));
            }
            return null;
        };
cache_file_name.__argnames__ = ["src", "cache_dir"];
cache_file_name.__module__ = "utils";
undefined;

        function charAt(s, n) {
            try {
                return s.charAt(n);
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                {
                    if (n < 0 || n >= (len?.__call__?.bind(len) ?? len)(s)) {
                        return "";
                    }
                    return s[(typeof n === "number" && n < 0) ? s.length + n : n];
                } 
            }
        };
charAt.__argnames__ = ["s", "n"];
charAt.__module__ = "utils";
undefined;

        function indexOf(s, t) {
            try {
                return s.indexOf(t);
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                {
                    try {
                        return s.index(t);
                    } catch (ρσ_Exception) {
                        ρσ_last_exception = ρσ_Exception;
                        {
                            return -1;
                        } 
                    }
                } 
            }
        };
indexOf.__argnames__ = ["s", "t"];
indexOf.__module__ = "utils";
undefined;

        function startswith(s, t) {
            try {
                return s.startsWith(t);
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                {
                    return s.startswith(t);
                } 
            }
        };
startswith.__argnames__ = ["s", "t"];
startswith.__module__ = "utils";
undefined;

        ρσ_modules.utils.has_prop = has_prop;
        ρσ_modules.utils.array_to_hash = array_to_hash;
        ρσ_modules.utils.characters = characters;
        ρσ_modules.utils.repeat_string = repeat_string;
        ρσ_modules.utils.DefaultsError = DefaultsError;
        ρσ_modules.utils.defaults = defaults;
        ρσ_modules.utils.merge = merge;
        ρσ_modules.utils.noop = noop;
        ρσ_modules.utils.push_uniq = push_uniq;
        ρσ_modules.utils.string_template = string_template;
        ρσ_modules.utils.make_predicate = make_predicate;
        ρσ_modules.utils.cache_file_name = cache_file_name;
        ρσ_modules.utils.charAt = charAt;
        ρσ_modules.utils.indexOf = indexOf;
        ρσ_modules.utils.startswith = startswith;
    })();

    (function(){
        var __name__ = "errors";
        function SyntaxError() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            SyntaxError.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(SyntaxError, Error);
        SyntaxError.prototype.__init__ = function __init__(message, filename, line, col, pos, is_eof) {
            var self = this;
            self.stack = (new Error).stack;
            self.message = message;
            self.line = line;
            self.col = col;
            self.pos = pos;
            self.is_eof = is_eof;
            self.filename = filename;
            self.lineNumber = line;
            self.fileName = filename;
        };
SyntaxError.prototype.__init__.__argnames__ = ["message", "filename", "line", "col", "pos", "is_eof"];
SyntaxError.prototype.__init__.__module__ = "errors";
undefined;
        SyntaxError.__argnames__ = SyntaxError.prototype.__init__.__argnames__;
        SyntaxError.__handles_kwarg_interpolation__ = SyntaxError.prototype.__init__.__handles_kwarg_interpolation__;
        SyntaxError.prototype.toString = function toString() {
            var self = this;
            var ans;
            ans = ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(self.message, " (line: "), self.line), ", col: "), self.col), ", pos: "), self.pos), ")");
            if (self.filename) {
                ans = ρσ_operator_add(ρσ_operator_add(self.filename, ":"), ans);
            }
            if (self.stack) {
                ans = ρσ_operator_iadd(ans, ρσ_operator_add("\n\n", self.stack));
            }
            return ans;
        };
SyntaxError.prototype.toString.__module__ = "errors";
undefined;
        SyntaxError.prototype.__repr__ = function __repr__ () {
            if(Error.prototype.__repr__) return Error.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        SyntaxError.prototype.__str__ = function __str__ () {
            if(Error.prototype.__str__) return Error.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(SyntaxError.prototype, "__bases__", {value: [Error]});

        function ImportError() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            ImportError.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(ImportError, SyntaxError);
        ImportError.prototype.__init__ = function __init__ () {
            SyntaxError.prototype.__init__ && SyntaxError.prototype.__init__.apply(this, arguments);
        };
        ImportError.prototype.__repr__ = function __repr__ () {
            if(SyntaxError.prototype.__repr__) return SyntaxError.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        ImportError.prototype.__str__ = function __str__ () {
            if(SyntaxError.prototype.__str__) return SyntaxError.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(ImportError.prototype, "__bases__", {value: [SyntaxError]});
        

        function EOFError() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            EOFError.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(EOFError, Error);
        EOFError.prototype.__init__ = function __init__ () {
            Error.prototype.__init__ && Error.prototype.__init__.apply(this, arguments);
        };
        EOFError.prototype.__repr__ = function __repr__ () {
            if(Error.prototype.__repr__) return Error.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        EOFError.prototype.__str__ = function __str__ () {
            if(Error.prototype.__str__) return Error.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(EOFError.prototype, "__bases__", {value: [Error]});
        

        function RuntimeError() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            RuntimeError.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(RuntimeError, Error);
        RuntimeError.prototype.__init__ = function __init__(message) {
            var self = this;
            self.message = message;
        };
RuntimeError.prototype.__init__.__argnames__ = ["message"];
RuntimeError.prototype.__init__.__module__ = "errors";
undefined;
        RuntimeError.__argnames__ = RuntimeError.prototype.__init__.__argnames__;
        RuntimeError.__handles_kwarg_interpolation__ = RuntimeError.prototype.__init__.__handles_kwarg_interpolation__;
        RuntimeError.prototype.__call__ = function __call__(message) {
            var self = this;
            return new RuntimeError(message);
        };
RuntimeError.prototype.__call__.__argnames__ = ["message"];
RuntimeError.prototype.__call__.__module__ = "errors";
undefined;
        RuntimeError.prototype.__repr__ = function __repr__ () {
            if(Error.prototype.__repr__) return Error.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        RuntimeError.prototype.__str__ = function __str__ () {
            if(Error.prototype.__str__) return Error.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(RuntimeError.prototype, "__bases__", {value: [Error]});

        ρσ_modules.errors.SyntaxError = SyntaxError;
        ρσ_modules.errors.ImportError = ImportError;
        ρσ_modules.errors.EOFError = EOFError;
        ρσ_modules.errors.RuntimeError = RuntimeError;
    })();

    (function(){
        var __name__ = "unicode_aliases";
        var DB, ALIAS_MAP;
        DB = "\n# NameAliases-8.0.0.txt\n# Date: 2014-11-19, 01:30:00 GMT [KW, LI]\n#\n# This file is a normative contributory data file in the\n# Unicode Character Database.\n#\n# Copyright (c) 2005-2014 Unicode, Inc.\n# For terms of use, see http://www.unicode.org/terms_of_use.html\n#\n# This file defines the formal name aliases for Unicode characters.\n#\n# For informative aliases, see NamesList.txt\n#\n# The formal name aliases are divided into five types, each with a distinct label.\n#\n# Type Labels:\n#\n# 1. correction\n#      Corrections for serious problems in the character names\n# 2. control\n#      ISO 6429 names for C0 and C1 control functions, and other\n#      commonly occurring names for control codes\n# 3. alternate\n#      A few widely used alternate names for format characters\n# 4. figment\n#      Several documented labels for C1 control code points which\n#      were never actually approved in any standard\n# 5. abbreviation\n#      Commonly occurring abbreviations (or acronyms) for control codes,\n#      format characters, spaces, and variation selectors\n#\n# The formal name aliases are part of the Unicode character namespace, which\n# includes the character names and the names of named character sequences.\n# The inclusion of ISO 6429 names and other commonly occurring names and\n# abbreviations for control codes and format characters as formal name aliases\n# is to help avoid name collisions between Unicode character names and the\n# labels which commonly appear in text and/or in implementations such as regex, for\n# control codes (which for historical reasons have no Unicode character name)\n# or for format characters.\n#\n# For documentation, see NamesList.html and http://www.unicode.org/reports/tr44/\n#\n# FORMAT\n#\n# Each line has three fields, as described here:\n#\n# First field:  Code point\n# Second field: Alias\n# Third field:  Type\n#\n# The type labels used are defined above. As for property values, comparisons\n# of type labels should ignore case.\n#\n# The type labels can be mapped to other strings for display, if desired.\n#\n# In case multiple aliases are assigned, additional aliases\n# are provided on separate lines. Parsers of this data file should\n# take note that the same code point can (and does) occur more than once.\n#\n# Note that currently the only instances of multiple aliases of the same\n# type for a single code point are either of type \"control\" or \"abbreviation\".\n# An alias of type \"abbreviation\" can, in principle, be added for any code\n# point, although currently aliases of type \"correction\" do not have\n# any additional aliases of type \"abbreviation\". Such relationships\n# are not enforced by stability policies.\n#\n#-----------------------------------------------------------------\n\n0000;NULL;control\n0000;NUL;abbreviation\n0001;START OF HEADING;control\n0001;SOH;abbreviation\n0002;START OF TEXT;control\n0002;STX;abbreviation\n0003;END OF TEXT;control\n0003;ETX;abbreviation\n0004;END OF TRANSMISSION;control\n0004;EOT;abbreviation\n0005;ENQUIRY;control\n0005;ENQ;abbreviation\n0006;ACKNOWLEDGE;control\n0006;ACK;abbreviation\n\n# Note that no formal name alias for the ISO 6429 \"BELL\" is\n# provided for U+0007, because of the existing name collision\n# with U+1F514 BELL.\n\n0007;ALERT;control\n0007;BEL;abbreviation\n\n0008;BACKSPACE;control\n0008;BS;abbreviation\n0009;CHARACTER TABULATION;control\n0009;HORIZONTAL TABULATION;control\n0009;HT;abbreviation\n0009;TAB;abbreviation\n000A;LINE FEED;control\n000A;NEW LINE;control\n000A;END OF LINE;control\n000A;LF;abbreviation\n000A;NL;abbreviation\n000A;EOL;abbreviation\n000B;LINE TABULATION;control\n000B;VERTICAL TABULATION;control\n000B;VT;abbreviation\n000C;FORM FEED;control\n000C;FF;abbreviation\n000D;CARRIAGE RETURN;control\n000D;CR;abbreviation\n000E;SHIFT OUT;control\n000E;LOCKING-SHIFT ONE;control\n000E;SO;abbreviation\n000F;SHIFT IN;control\n000F;LOCKING-SHIFT ZERO;control\n000F;SI;abbreviation\n0010;DATA LINK ESCAPE;control\n0010;DLE;abbreviation\n0011;DEVICE CONTROL ONE;control\n0011;DC1;abbreviation\n0012;DEVICE CONTROL TWO;control\n0012;DC2;abbreviation\n0013;DEVICE CONTROL THREE;control\n0013;DC3;abbreviation\n0014;DEVICE CONTROL FOUR;control\n0014;DC4;abbreviation\n0015;NEGATIVE ACKNOWLEDGE;control\n0015;NAK;abbreviation\n0016;SYNCHRONOUS IDLE;control\n0016;SYN;abbreviation\n0017;END OF TRANSMISSION BLOCK;control\n0017;ETB;abbreviation\n0018;CANCEL;control\n0018;CAN;abbreviation\n0019;END OF MEDIUM;control\n0019;EOM;abbreviation\n001A;SUBSTITUTE;control\n001A;SUB;abbreviation\n001B;ESCAPE;control\n001B;ESC;abbreviation\n001C;INFORMATION SEPARATOR FOUR;control\n001C;FILE SEPARATOR;control\n001C;FS;abbreviation\n001D;INFORMATION SEPARATOR THREE;control\n001D;GROUP SEPARATOR;control\n001D;GS;abbreviation\n001E;INFORMATION SEPARATOR TWO;control\n001E;RECORD SEPARATOR;control\n001E;RS;abbreviation\n001F;INFORMATION SEPARATOR ONE;control\n001F;UNIT SEPARATOR;control\n001F;US;abbreviation\n0020;SP;abbreviation\n007F;DELETE;control\n007F;DEL;abbreviation\n\n# PADDING CHARACTER and HIGH OCTET PRESET represent\n# architectural concepts initially proposed for early\n# drafts of ISO/IEC 10646-1. They were never actually\n# approved or standardized: hence their designation\n# here as the \"figment\" type. Formal name aliases\n# (and corresponding abbreviations) for these code\n# points are included here because these names leaked\n# out from the draft documents and were published in\n# at least one RFC whose names for code points was\n# implemented in Perl regex expressions.\n\n0080;PADDING CHARACTER;figment\n0080;PAD;abbreviation\n0081;HIGH OCTET PRESET;figment\n0081;HOP;abbreviation\n\n0082;BREAK PERMITTED HERE;control\n0082;BPH;abbreviation\n0083;NO BREAK HERE;control\n0083;NBH;abbreviation\n0084;INDEX;control\n0084;IND;abbreviation\n0085;NEXT LINE;control\n0085;NEL;abbreviation\n0086;START OF SELECTED AREA;control\n0086;SSA;abbreviation\n0087;END OF SELECTED AREA;control\n0087;ESA;abbreviation\n0088;CHARACTER TABULATION SET;control\n0088;HORIZONTAL TABULATION SET;control\n0088;HTS;abbreviation\n0089;CHARACTER TABULATION WITH JUSTIFICATION;control\n0089;HORIZONTAL TABULATION WITH JUSTIFICATION;control\n0089;HTJ;abbreviation\n008A;LINE TABULATION SET;control\n008A;VERTICAL TABULATION SET;control\n008A;VTS;abbreviation\n008B;PARTIAL LINE FORWARD;control\n008B;PARTIAL LINE DOWN;control\n008B;PLD;abbreviation\n008C;PARTIAL LINE BACKWARD;control\n008C;PARTIAL LINE UP;control\n008C;PLU;abbreviation\n008D;REVERSE LINE FEED;control\n008D;REVERSE INDEX;control\n008D;RI;abbreviation\n008E;SINGLE SHIFT TWO;control\n008E;SINGLE-SHIFT-2;control\n008E;SS2;abbreviation\n008F;SINGLE SHIFT THREE;control\n008F;SINGLE-SHIFT-3;control\n008F;SS3;abbreviation\n0090;DEVICE CONTROL STRING;control\n0090;DCS;abbreviation\n0091;PRIVATE USE ONE;control\n0091;PRIVATE USE-1;control\n0091;PU1;abbreviation\n0092;PRIVATE USE TWO;control\n0092;PRIVATE USE-2;control\n0092;PU2;abbreviation\n0093;SET TRANSMIT STATE;control\n0093;STS;abbreviation\n0094;CANCEL CHARACTER;control\n0094;CCH;abbreviation\n0095;MESSAGE WAITING;control\n0095;MW;abbreviation\n0096;START OF GUARDED AREA;control\n0096;START OF PROTECTED AREA;control\n0096;SPA;abbreviation\n0097;END OF GUARDED AREA;control\n0097;END OF PROTECTED AREA;control\n0097;EPA;abbreviation\n0098;START OF STRING;control\n0098;SOS;abbreviation\n\n# SINGLE GRAPHIC CHARACTER INTRODUCER is another\n# architectural concept from early drafts of ISO/IEC 10646-1\n# which was never approved and standardized.\n\n0099;SINGLE GRAPHIC CHARACTER INTRODUCER;figment\n0099;SGC;abbreviation\n\n009A;SINGLE CHARACTER INTRODUCER;control\n009A;SCI;abbreviation\n009B;CONTROL SEQUENCE INTRODUCER;control\n009B;CSI;abbreviation\n009C;STRING TERMINATOR;control\n009C;ST;abbreviation\n009D;OPERATING SYSTEM COMMAND;control\n009D;OSC;abbreviation\n009E;PRIVACY MESSAGE;control\n009E;PM;abbreviation\n009F;APPLICATION PROGRAM COMMAND;control\n009F;APC;abbreviation\n00A0;NBSP;abbreviation\n00AD;SHY;abbreviation\n01A2;LATIN CAPITAL LETTER GHA;correction\n01A3;LATIN SMALL LETTER GHA;correction\n034F;CGJ;abbreviation\n061C;ALM;abbreviation\n0709;SYRIAC SUBLINEAR COLON SKEWED LEFT;correction\n0CDE;KANNADA LETTER LLLA;correction\n0E9D;LAO LETTER FO FON;correction\n0E9F;LAO LETTER FO FAY;correction\n0EA3;LAO LETTER RO;correction\n0EA5;LAO LETTER LO;correction\n0FD0;TIBETAN MARK BKA- SHOG GI MGO RGYAN;correction\n180B;FVS1;abbreviation\n180C;FVS2;abbreviation\n180D;FVS3;abbreviation\n180E;MVS;abbreviation\n200B;ZWSP;abbreviation\n200C;ZWNJ;abbreviation\n200D;ZWJ;abbreviation\n200E;LRM;abbreviation\n200F;RLM;abbreviation\n202A;LRE;abbreviation\n202B;RLE;abbreviation\n202C;PDF;abbreviation\n202D;LRO;abbreviation\n202E;RLO;abbreviation\n202F;NNBSP;abbreviation\n205F;MMSP;abbreviation\n2060;WJ;abbreviation\n2066;LRI;abbreviation\n2067;RLI;abbreviation\n2068;FSI;abbreviation\n2069;PDI;abbreviation\n2118;WEIERSTRASS ELLIPTIC FUNCTION;correction\n2448;MICR ON US SYMBOL;correction\n2449;MICR DASH SYMBOL;correction\n2B7A;LEFTWARDS TRIANGLE-HEADED ARROW WITH DOUBLE VERTICAL STROKE;correction\n2B7C;RIGHTWARDS TRIANGLE-HEADED ARROW WITH DOUBLE VERTICAL STROKE;correction\nA015;YI SYLLABLE ITERATION MARK;correction\nFE18;PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET;correction\nFE00;VS1;abbreviation\nFE01;VS2;abbreviation\nFE02;VS3;abbreviation\nFE03;VS4;abbreviation\nFE04;VS5;abbreviation\nFE05;VS6;abbreviation\nFE06;VS7;abbreviation\nFE07;VS8;abbreviation\nFE08;VS9;abbreviation\nFE09;VS10;abbreviation\nFE0A;VS11;abbreviation\nFE0B;VS12;abbreviation\nFE0C;VS13;abbreviation\nFE0D;VS14;abbreviation\nFE0E;VS15;abbreviation\nFE0F;VS16;abbreviation\nFEFF;BYTE ORDER MARK;alternate\nFEFF;BOM;abbreviation\nFEFF;ZWNBSP;abbreviation\n122D4;CUNEIFORM SIGN NU11 TENU;correction\n122D5;CUNEIFORM SIGN NU11 OVER NU11 BUR OVER BUR;correction\n1D0C5;BYZANTINE MUSICAL SYMBOL FTHORA SKLIRON CHROMA VASIS;correction\nE0100;VS17;abbreviation\nE0101;VS18;abbreviation\nE0102;VS19;abbreviation\nE0103;VS20;abbreviation\nE0104;VS21;abbreviation\nE0105;VS22;abbreviation\nE0106;VS23;abbreviation\nE0107;VS24;abbreviation\nE0108;VS25;abbreviation\nE0109;VS26;abbreviation\nE010A;VS27;abbreviation\nE010B;VS28;abbreviation\nE010C;VS29;abbreviation\nE010D;VS30;abbreviation\nE010E;VS31;abbreviation\nE010F;VS32;abbreviation\nE0110;VS33;abbreviation\nE0111;VS34;abbreviation\nE0112;VS35;abbreviation\nE0113;VS36;abbreviation\nE0114;VS37;abbreviation\nE0115;VS38;abbreviation\nE0116;VS39;abbreviation\nE0117;VS40;abbreviation\nE0118;VS41;abbreviation\nE0119;VS42;abbreviation\nE011A;VS43;abbreviation\nE011B;VS44;abbreviation\nE011C;VS45;abbreviation\nE011D;VS46;abbreviation\nE011E;VS47;abbreviation\nE011F;VS48;abbreviation\nE0120;VS49;abbreviation\nE0121;VS50;abbreviation\nE0122;VS51;abbreviation\nE0123;VS52;abbreviation\nE0124;VS53;abbreviation\nE0125;VS54;abbreviation\nE0126;VS55;abbreviation\nE0127;VS56;abbreviation\nE0128;VS57;abbreviation\nE0129;VS58;abbreviation\nE012A;VS59;abbreviation\nE012B;VS60;abbreviation\nE012C;VS61;abbreviation\nE012D;VS62;abbreviation\nE012E;VS63;abbreviation\nE012F;VS64;abbreviation\nE0130;VS65;abbreviation\nE0131;VS66;abbreviation\nE0132;VS67;abbreviation\nE0133;VS68;abbreviation\nE0134;VS69;abbreviation\nE0135;VS70;abbreviation\nE0136;VS71;abbreviation\nE0137;VS72;abbreviation\nE0138;VS73;abbreviation\nE0139;VS74;abbreviation\nE013A;VS75;abbreviation\nE013B;VS76;abbreviation\nE013C;VS77;abbreviation\nE013D;VS78;abbreviation\nE013E;VS79;abbreviation\nE013F;VS80;abbreviation\nE0140;VS81;abbreviation\nE0141;VS82;abbreviation\nE0142;VS83;abbreviation\nE0143;VS84;abbreviation\nE0144;VS85;abbreviation\nE0145;VS86;abbreviation\nE0146;VS87;abbreviation\nE0147;VS88;abbreviation\nE0148;VS89;abbreviation\nE0149;VS90;abbreviation\nE014A;VS91;abbreviation\nE014B;VS92;abbreviation\nE014C;VS93;abbreviation\nE014D;VS94;abbreviation\nE014E;VS95;abbreviation\nE014F;VS96;abbreviation\nE0150;VS97;abbreviation\nE0151;VS98;abbreviation\nE0152;VS99;abbreviation\nE0153;VS100;abbreviation\nE0154;VS101;abbreviation\nE0155;VS102;abbreviation\nE0156;VS103;abbreviation\nE0157;VS104;abbreviation\nE0158;VS105;abbreviation\nE0159;VS106;abbreviation\nE015A;VS107;abbreviation\nE015B;VS108;abbreviation\nE015C;VS109;abbreviation\nE015D;VS110;abbreviation\nE015E;VS111;abbreviation\nE015F;VS112;abbreviation\nE0160;VS113;abbreviation\nE0161;VS114;abbreviation\nE0162;VS115;abbreviation\nE0163;VS116;abbreviation\nE0164;VS117;abbreviation\nE0165;VS118;abbreviation\nE0166;VS119;abbreviation\nE0167;VS120;abbreviation\nE0168;VS121;abbreviation\nE0169;VS122;abbreviation\nE016A;VS123;abbreviation\nE016B;VS124;abbreviation\nE016C;VS125;abbreviation\nE016D;VS126;abbreviation\nE016E;VS127;abbreviation\nE016F;VS128;abbreviation\nE0170;VS129;abbreviation\nE0171;VS130;abbreviation\nE0172;VS131;abbreviation\nE0173;VS132;abbreviation\nE0174;VS133;abbreviation\nE0175;VS134;abbreviation\nE0176;VS135;abbreviation\nE0177;VS136;abbreviation\nE0178;VS137;abbreviation\nE0179;VS138;abbreviation\nE017A;VS139;abbreviation\nE017B;VS140;abbreviation\nE017C;VS141;abbreviation\nE017D;VS142;abbreviation\nE017E;VS143;abbreviation\nE017F;VS144;abbreviation\nE0180;VS145;abbreviation\nE0181;VS146;abbreviation\nE0182;VS147;abbreviation\nE0183;VS148;abbreviation\nE0184;VS149;abbreviation\nE0185;VS150;abbreviation\nE0186;VS151;abbreviation\nE0187;VS152;abbreviation\nE0188;VS153;abbreviation\nE0189;VS154;abbreviation\nE018A;VS155;abbreviation\nE018B;VS156;abbreviation\nE018C;VS157;abbreviation\nE018D;VS158;abbreviation\nE018E;VS159;abbreviation\nE018F;VS160;abbreviation\nE0190;VS161;abbreviation\nE0191;VS162;abbreviation\nE0192;VS163;abbreviation\nE0193;VS164;abbreviation\nE0194;VS165;abbreviation\nE0195;VS166;abbreviation\nE0196;VS167;abbreviation\nE0197;VS168;abbreviation\nE0198;VS169;abbreviation\nE0199;VS170;abbreviation\nE019A;VS171;abbreviation\nE019B;VS172;abbreviation\nE019C;VS173;abbreviation\nE019D;VS174;abbreviation\nE019E;VS175;abbreviation\nE019F;VS176;abbreviation\nE01A0;VS177;abbreviation\nE01A1;VS178;abbreviation\nE01A2;VS179;abbreviation\nE01A3;VS180;abbreviation\nE01A4;VS181;abbreviation\nE01A5;VS182;abbreviation\nE01A6;VS183;abbreviation\nE01A7;VS184;abbreviation\nE01A8;VS185;abbreviation\nE01A9;VS186;abbreviation\nE01AA;VS187;abbreviation\nE01AB;VS188;abbreviation\nE01AC;VS189;abbreviation\nE01AD;VS190;abbreviation\nE01AE;VS191;abbreviation\nE01AF;VS192;abbreviation\nE01B0;VS193;abbreviation\nE01B1;VS194;abbreviation\nE01B2;VS195;abbreviation\nE01B3;VS196;abbreviation\nE01B4;VS197;abbreviation\nE01B5;VS198;abbreviation\nE01B6;VS199;abbreviation\nE01B7;VS200;abbreviation\nE01B8;VS201;abbreviation\nE01B9;VS202;abbreviation\nE01BA;VS203;abbreviation\nE01BB;VS204;abbreviation\nE01BC;VS205;abbreviation\nE01BD;VS206;abbreviation\nE01BE;VS207;abbreviation\nE01BF;VS208;abbreviation\nE01C0;VS209;abbreviation\nE01C1;VS210;abbreviation\nE01C2;VS211;abbreviation\nE01C3;VS212;abbreviation\nE01C4;VS213;abbreviation\nE01C5;VS214;abbreviation\nE01C6;VS215;abbreviation\nE01C7;VS216;abbreviation\nE01C8;VS217;abbreviation\nE01C9;VS218;abbreviation\nE01CA;VS219;abbreviation\nE01CB;VS220;abbreviation\nE01CC;VS221;abbreviation\nE01CD;VS222;abbreviation\nE01CE;VS223;abbreviation\nE01CF;VS224;abbreviation\nE01D0;VS225;abbreviation\nE01D1;VS226;abbreviation\nE01D2;VS227;abbreviation\nE01D3;VS228;abbreviation\nE01D4;VS229;abbreviation\nE01D5;VS230;abbreviation\nE01D6;VS231;abbreviation\nE01D7;VS232;abbreviation\nE01D8;VS233;abbreviation\nE01D9;VS234;abbreviation\nE01DA;VS235;abbreviation\nE01DB;VS236;abbreviation\nE01DC;VS237;abbreviation\nE01DD;VS238;abbreviation\nE01DE;VS239;abbreviation\nE01DF;VS240;abbreviation\nE01E0;VS241;abbreviation\nE01E1;VS242;abbreviation\nE01E2;VS243;abbreviation\nE01E3;VS244;abbreviation\nE01E4;VS245;abbreviation\nE01E5;VS246;abbreviation\nE01E6;VS247;abbreviation\nE01E7;VS248;abbreviation\nE01E8;VS249;abbreviation\nE01E9;VS250;abbreviation\nE01EA;VS251;abbreviation\nE01EB;VS252;abbreviation\nE01EC;VS253;abbreviation\nE01ED;VS254;abbreviation\nE01EE;VS255;abbreviation\nE01EF;VS256;abbreviation\n\n# EOF\n";
        function make_alias_map() {
            var ans, line, parts, code_point;
            ans = {};
            var ρσ_Iter5 = DB.split("\n");
            ρσ_Iter5 = ((typeof ρσ_Iter5[Symbol.iterator] === "function") ? (ρσ_Iter5 instanceof Map ? ρσ_Iter5.keys() : ρσ_Iter5) : Object.keys(ρσ_Iter5));
            for (var ρσ_Index5 of ρσ_Iter5) {
                line = ρσ_Index5;
                line = line.trim();
                if (!line || line[0] === "#") {
                    continue;
                }
                parts = line.split(";");
                if (parts.length >= 2) {
                    code_point = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(parts[0], 16);
                    if (code_point !== undefined && parts[1]) {
                        ans[ρσ_bound_index(parts[1].toLowerCase(), ans)] = code_point;
                    }
                }
            }
            return ans;
        };
make_alias_map.__module__ = "unicode_aliases";
undefined;

        ALIAS_MAP = (make_alias_map?.__call__?.bind(make_alias_map) ?? make_alias_map)();
        ρσ_modules.unicode_aliases.DB = DB;
        ρσ_modules.unicode_aliases.ALIAS_MAP = ALIAS_MAP;
        ρσ_modules.unicode_aliases.make_alias_map = make_alias_map;
    })();

    (function(){
        var __name__ = "js";
        function js_new() {
            var f = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
            var kwds = arguments[arguments.length-1];
            if (kwds === null || typeof kwds !== "object" || kwds [ρσ_kwargs_symbol] !== true) kwds = {};
            var args = Array.prototype.slice.call(arguments, 1);
            if (kwds !== null && typeof kwds === "object" && kwds [ρσ_kwargs_symbol] === true) args.pop();
            return ρσ_interpolate_kwargs_constructor.call(Object.create(f.prototype), false, f, args.concat([ρσ_desugar_kwargs(kwds)]));
        };
js_new.__handles_kwarg_interpolation__ = true;
js_new.__argnames__ = ["f"];
js_new.__module__ = "js";
undefined;

        function js_instanceof(obj, cls) {
            return obj instanceof cls;
        };
js_instanceof.__argnames__ = ["obj", "cls"];
js_instanceof.__module__ = "js";
undefined;

        ρσ_modules.js.js_new = js_new;
        ρσ_modules.js.js_instanceof = js_instanceof;
    })();

    (function(){
        var __name__ = "ast_types";
        var noop = ρσ_modules.utils.noop;

        var js_instanceof = ρσ_modules.js.js_instanceof;
        var js_new = ρσ_modules.js.js_new;

        function is_node_type(node, typ) {
            return (js_instanceof?.__call__?.bind(js_instanceof) ?? js_instanceof)(node, typ);
        };
is_node_type.__argnames__ = ["node", "typ"];
is_node_type.__module__ = "ast_types";
undefined;

        function AST() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST.prototype.__init__.apply(this, arguments);
        }
        AST.prototype.__init__ = function __init__(initializer) {
            var self = this;
            var obj, i;
            if (initializer) {
                obj = self;
                while (true) {
                    obj = Object.getPrototypeOf(obj);
                    if (obj === null) {
                        break;
                    }
                    if (obj.properties) {
                        var ρσ_Iter6 = obj.properties;
                        ρσ_Iter6 = ((typeof ρσ_Iter6[Symbol.iterator] === "function") ? (ρσ_Iter6 instanceof Map ? ρσ_Iter6.keys() : ρσ_Iter6) : Object.keys(ρσ_Iter6));
                        for (var ρσ_Index6 of ρσ_Iter6) {
                            i = ρσ_Index6;
                            self[(typeof i === "number" && i < 0) ? self.length + i : i] = initializer[(typeof i === "number" && i < 0) ? initializer.length + i : i];
                        }
                    }
                }
            }
        };
AST.prototype.__init__.__argnames__ = ["initializer"];
AST.prototype.__init__.__module__ = "ast_types";
undefined;
        AST.__argnames__ = AST.prototype.__init__.__argnames__;
        AST.__handles_kwarg_interpolation__ = AST.prototype.__init__.__handles_kwarg_interpolation__;
        AST.prototype.clone = function clone() {
            var self = this;
            return (js_new?.__call__?.bind(js_new) ?? js_new)(self.constructor(self));
        };
AST.prototype.clone.__module__ = "ast_types";
undefined;
        AST.prototype.__repr__ = function __repr__ () {
                        return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST.prototype.__str__ = function __str__ () {
            return this.__repr__();
        };
        Object.defineProperty(AST.prototype, "__bases__", {value: []});
        AST.prototype.properties = {};

        function AST_Token() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Token.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Token, AST);
        AST_Token.prototype.__init__ = function __init__ () {
            AST.prototype.__init__ && AST.prototype.__init__.apply(this, arguments);
        };
        AST_Token.prototype.__repr__ = function __repr__ () {
            if(AST.prototype.__repr__) return AST.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Token.prototype.__str__ = function __str__ () {
            if(AST.prototype.__str__) return AST.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Token.prototype, "__bases__", {value: [AST]});
        AST_Token.prototype.properties = {"type":"The type of the token","value":"The value of the token","line":"The line number at which the token occurs","col":"The column number at which the token occurs","pos":"","endpos":"","nlb":"True iff there was a newline before this token","comments_before":"True iff there were comments before this token","file":"The filename in which this token occurs","leading_whitespace":"The leading whitespace for the line on which this token occurs"};

        function AST_Node() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Node.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Node, AST);
        AST_Node.prototype.__init__ = function __init__ () {
            AST.prototype.__init__ && AST.prototype.__init__.apply(this, arguments);
        };
        AST_Node.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self);
        };
AST_Node.prototype._walk.__argnames__ = ["visitor"];
AST_Node.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Node.prototype.walk = function walk(visitor) {
            var self = this;
            return self._walk(visitor);
        };
AST_Node.prototype.walk.__argnames__ = ["visitor"];
AST_Node.prototype.walk.__module__ = "ast_types";
undefined;
        AST_Node.prototype._dump = function _dump() {
            var self = this;
            var depth = (arguments[0] === undefined || ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? _dump.__defaults__.depth : arguments[0];
            var omit = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? _dump.__defaults__.omit : arguments[1];
            var offset = (arguments[2] === undefined || ( 2 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? _dump.__defaults__.offset : arguments[2];
            var include_name = (arguments[3] === undefined || ( 3 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? _dump.__defaults__.include_name : arguments[3];
            var ρσ_kwargs_obj = arguments[arguments.length-1];
            if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "depth")){
                depth = ρσ_kwargs_obj.depth;
            }
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "omit")){
                omit = ρσ_kwargs_obj.omit;
            }
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "offset")){
                offset = ρσ_kwargs_obj.offset;
            }
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "include_name")){
                include_name = ρσ_kwargs_obj.include_name;
            }
            var p, reset, yellow, blue, green, red, magenta, pad, element, tname, property, key;
            p = console.log;
            reset = "\u001b[0m";
            yellow = "\u001b[33m";
            blue = "\u001b[34m";
            green = "\u001b[32m";
            red = "\u001b[31m";
            magenta = "\u001b[35m";
            pad = new Array(ρσ_operator_add(offset, 1)).join("  ");
            if (include_name) {
                (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, yellow), self.constructor.name.slice(4)), reset));
            }
            var ρσ_Iter7 = self;
            ρσ_Iter7 = ((typeof ρσ_Iter7[Symbol.iterator] === "function") ? (ρσ_Iter7 instanceof Map ? ρσ_Iter7.keys() : ρσ_Iter7) : Object.keys(ρσ_Iter7));
            for (var ρσ_Index7 of ρσ_Iter7) {
                key = ρσ_Index7;
                if (ρσ_in(key, omit)) {
                    continue;
                }
                if (Array.isArray(self[(typeof key === "number" && key < 0) ? self.length + key : key])) {
                    if (self[(typeof key === "number" && key < 0) ? self.length + key : key].length) {
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), reset), "["));
                        if (depth > 1) {
                            var ρσ_Iter8 = self[(typeof key === "number" && key < 0) ? self.length + key : key];
                            ρσ_Iter8 = ((typeof ρσ_Iter8[Symbol.iterator] === "function") ? (ρσ_Iter8 instanceof Map ? ρσ_Iter8.keys() : ρσ_Iter8) : Object.keys(ρσ_Iter8));
                            for (var ρσ_Index8 of ρσ_Iter8) {
                                element = ρσ_Index8;
                                element._dump(ρσ_operator_sub(depth, 1), omit, ρσ_operator_add(offset, 1), true);
                            }
                        } else {
                            var ρσ_Iter9 = self[(typeof key === "number" && key < 0) ? self.length + key : key];
                            ρσ_Iter9 = ((typeof ρσ_Iter9[Symbol.iterator] === "function") ? (ρσ_Iter9 instanceof Map ? ρσ_Iter9.keys() : ρσ_Iter9) : Object.keys(ρσ_Iter9));
                            for (var ρσ_Index9 of ρσ_Iter9) {
                                element = ρσ_Index9;
                                (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, "   "), yellow), element.constructor.name.slice(4)), reset));
                            }
                        }
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(pad, " ]"));
                    } else {
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), reset), "[]"));
                    }
                } else if (self[(typeof key === "number" && key < 0) ? self.length + key : key]) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self[(typeof key === "number" && key < 0) ? self.length + key : key], AST)) {
                        tname = self[(typeof key === "number" && key < 0) ? self.length + key : key].constructor.name.slice(4);
                        if (tname === "Token") {
                            (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), magenta), tname), reset));
                            var ρσ_Iter10 = self[(typeof key === "number" && key < 0) ? self.length + key : key];
                            ρσ_Iter10 = ((typeof ρσ_Iter10[Symbol.iterator] === "function") ? (ρσ_Iter10 instanceof Map ? ρσ_Iter10.keys() : ρσ_Iter10) : Object.keys(ρσ_Iter10));
                            for (var ρσ_Index10 of ρσ_Iter10) {
                                property = ρσ_Index10;
                                (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, "   "), blue), property), ": "), reset), (ρσ_expr_temp = self[(typeof key === "number" && key < 0) ? self.length + key : key])[(typeof property === "number" && property < 0) ? ρσ_expr_temp.length + property : property]));
                            }
                        } else {
                            (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), yellow), tname), reset));
                            if (depth > 1) {
                                self[(typeof key === "number" && key < 0) ? self.length + key : key]._dump(ρσ_operator_sub(depth, 1), omit, ρσ_operator_add(offset, 1), false);
                            }
                        }
                    } else if (typeof self[(typeof key === "number" && key < 0) ? self.length + key : key] === "string") {
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), green), "\""), self[(typeof key === "number" && key < 0) ? self.length + key : key]), "\""), reset));
                    } else if (typeof self[(typeof key === "number" && key < 0) ? self.length + key : key] === "number") {
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), green), self[(typeof key === "number" && key < 0) ? self.length + key : key]), reset));
                    } else {
                        (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), red), self[(typeof key === "number" && key < 0) ? self.length + key : key]), reset));
                    }
                } else {
                    (p?.__call__?.bind(p) ?? p)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(pad, " "), blue), key), ": "), reset), self[(typeof key === "number" && key < 0) ? self.length + key : key]));
                }
            }
        };
AST_Node.prototype._dump.__defaults__ = {depth:100, omit:(function(){
            var s = ρσ_set();
            s.jsset.add("start");
            s.jsset.add("end");
            return s;
        })(), offset:0, include_name:true};
AST_Node.prototype._dump.__handles_kwarg_interpolation__ = true;
AST_Node.prototype._dump.__argnames__ = ["depth", "omit", "offset", "include_name"];
AST_Node.prototype._dump.__module__ = "ast_types";
undefined;
        AST_Node.prototype.dump = function dump() {
            var self = this;
            var depth = (arguments[0] === undefined || ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? dump.__defaults__.depth : arguments[0];
            var omit = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? dump.__defaults__.omit : arguments[1];
            var ρσ_kwargs_obj = arguments[arguments.length-1];
            if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "depth")){
                depth = ρσ_kwargs_obj.depth;
            }
            if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "omit")){
                omit = ρσ_kwargs_obj.omit;
            }
            return self._dump(depth, omit, 0, true);
        };
AST_Node.prototype.dump.__defaults__ = {depth:2, omit:{}};
AST_Node.prototype.dump.__handles_kwarg_interpolation__ = true;
AST_Node.prototype.dump.__argnames__ = ["depth", "omit"];
AST_Node.prototype.dump.__module__ = "ast_types";
undefined;
        AST_Node.prototype.__repr__ = function __repr__ () {
            if(AST.prototype.__repr__) return AST.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Node.prototype.__str__ = function __str__ () {
            if(AST.prototype.__str__) return AST.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Node.prototype, "__bases__", {value: [AST]});
        AST_Node.prototype.properties = {"start":"[AST_Token] The first token of this node","end":"[AST_Token] The last token of this node"};

        function AST_Statement() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Statement.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Statement, AST_Node);
        AST_Statement.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Statement.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Statement.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Statement.prototype, "__bases__", {value: [AST_Node]});

        function AST_Debugger() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Debugger.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Debugger, AST_Statement);
        AST_Debugger.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Debugger.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Debugger.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Debugger.prototype, "__bases__", {value: [AST_Statement]});

        function AST_Directive() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Directive.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Directive, AST_Statement);
        AST_Directive.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Directive.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Directive.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Directive.prototype, "__bases__", {value: [AST_Statement]});
        AST_Directive.prototype.properties = {"value":"[string] The value of this directive as a plain string (it's not an AST_String!)","scope":"[AST_Scope/S] The scope that this directive affects"};

        function AST_SimpleStatement() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SimpleStatement.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SimpleStatement, AST_Statement);
        AST_SimpleStatement.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_SimpleStatement.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return self.body._walk(visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_SimpleStatement.prototype._walk.__argnames__ = ["visitor"];
AST_SimpleStatement.prototype._walk.__module__ = "ast_types";
undefined;
        AST_SimpleStatement.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SimpleStatement.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SimpleStatement.prototype, "__bases__", {value: [AST_Statement]});
        AST_SimpleStatement.prototype.properties = {"body":"[AST_Node] an expression node (should not be instanceof AST_Statement)"};

        function AST_Assert() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Assert.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Assert, AST_Statement);
        AST_Assert.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Assert.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_assert() {
                self.condition._walk(visitor);
                if (self.message) {
                    self.message._walk(visitor);
                }
            };
f_assert.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_assert);
        };
AST_Assert.prototype._walk.__argnames__ = ["visitor"];
AST_Assert.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Assert.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Assert.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Assert.prototype, "__bases__", {value: [AST_Statement]});
        AST_Assert.prototype.properties = {"condition":"[AST_Node] the expression that should be tested","message":"[AST_Node*] the expression that is the error message or None"};

        function walk_body(node, visitor) {
            var stat;
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node.body, AST_Statement)) {
                node.body._walk(visitor);
            } else if (node.body) {
                var ρσ_Iter11 = node.body;
                ρσ_Iter11 = ((typeof ρσ_Iter11[Symbol.iterator] === "function") ? (ρσ_Iter11 instanceof Map ? ρσ_Iter11.keys() : ρσ_Iter11) : Object.keys(ρσ_Iter11));
                for (var ρσ_Index11 of ρσ_Iter11) {
                    stat = ρσ_Index11;
                    stat._walk(visitor);
                }
            }
        };
walk_body.__argnames__ = ["node", "visitor"];
walk_body.__module__ = "ast_types";
undefined;

        function AST_Block() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Block.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Block, AST_Statement);
        AST_Block.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Block.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return (walk_body?.__call__?.bind(walk_body) ?? walk_body)(self, visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_Block.prototype._walk.__argnames__ = ["visitor"];
AST_Block.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Block.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Block.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Block.prototype, "__bases__", {value: [AST_Statement]});
        AST_Block.prototype.properties = {"body":"[AST_Statement*] an array of statements"};

        function AST_BlockStatement() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_BlockStatement.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_BlockStatement, AST_Block);
        AST_BlockStatement.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_BlockStatement.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_BlockStatement.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_BlockStatement.prototype, "__bases__", {value: [AST_Block]});

        function AST_EmptyStatement() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_EmptyStatement.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_EmptyStatement, AST_Statement);
        AST_EmptyStatement.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_EmptyStatement.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self);
        };
AST_EmptyStatement.prototype._walk.__argnames__ = ["visitor"];
AST_EmptyStatement.prototype._walk.__module__ = "ast_types";
undefined;
        AST_EmptyStatement.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_EmptyStatement.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_EmptyStatement.prototype, "__bases__", {value: [AST_Statement]});
        AST_EmptyStatement.prototype.properties = {"stype":"[string] the type of empty statement. Is ; for semicolons"};

        function AST_StatementWithBody() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_StatementWithBody, AST_Statement);
        AST_StatementWithBody.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_StatementWithBody.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return self.body._walk(visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_StatementWithBody.prototype._walk.__argnames__ = ["visitor"];
AST_StatementWithBody.prototype._walk.__module__ = "ast_types";
undefined;
        AST_StatementWithBody.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_StatementWithBody.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_StatementWithBody.prototype, "__bases__", {value: [AST_Statement]});
        AST_StatementWithBody.prototype.properties = {"body":"[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"};

        function AST_DWLoop() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_DWLoop.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_DWLoop, AST_StatementWithBody);
        AST_DWLoop.prototype.__init__ = function __init__ () {
            AST_StatementWithBody.prototype.__init__ && AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        };
        AST_DWLoop.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return ρσ_list_decorate([ self.condition._walk(visitor), self.body._walk(visitor) ]);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_DWLoop.prototype._walk.__argnames__ = ["visitor"];
AST_DWLoop.prototype._walk.__module__ = "ast_types";
undefined;
        AST_DWLoop.prototype.__repr__ = function __repr__ () {
            if(AST_StatementWithBody.prototype.__repr__) return AST_StatementWithBody.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_DWLoop.prototype.__str__ = function __str__ () {
            if(AST_StatementWithBody.prototype.__str__) return AST_StatementWithBody.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_DWLoop.prototype, "__bases__", {value: [AST_StatementWithBody]});
        AST_DWLoop.prototype.properties = {"condition":"[AST_Node] the loop condition.  Should not be instanceof AST_Statement"};

        function AST_Do() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Do.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Do, AST_DWLoop);
        AST_Do.prototype.__init__ = function __init__ () {
            AST_DWLoop.prototype.__init__ && AST_DWLoop.prototype.__init__.apply(this, arguments);
        };
        AST_Do.prototype.__repr__ = function __repr__ () {
            if(AST_DWLoop.prototype.__repr__) return AST_DWLoop.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Do.prototype.__str__ = function __str__ () {
            if(AST_DWLoop.prototype.__str__) return AST_DWLoop.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Do.prototype, "__bases__", {value: [AST_DWLoop]});

        function AST_While() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_While.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_While, AST_DWLoop);
        AST_While.prototype.__init__ = function __init__ () {
            AST_DWLoop.prototype.__init__ && AST_DWLoop.prototype.__init__.apply(this, arguments);
        };
        AST_While.prototype.__repr__ = function __repr__ () {
            if(AST_DWLoop.prototype.__repr__) return AST_DWLoop.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_While.prototype.__str__ = function __str__ () {
            if(AST_DWLoop.prototype.__str__) return AST_DWLoop.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_While.prototype, "__bases__", {value: [AST_DWLoop]});

        function AST_ForIn() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ForIn.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ForIn, AST_StatementWithBody);
        AST_ForIn.prototype.__init__ = function __init__ () {
            AST_StatementWithBody.prototype.__init__ && AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        };
        AST_ForIn.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_for_in() {
                self.init._walk(visitor);
                if (self.name) {
                    self.name._walk(visitor);
                }
                self.object._walk(visitor);
                if (self.body) {
                    self.body._walk(visitor);
                }
            };
f_for_in.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_for_in);
        };
AST_ForIn.prototype._walk.__argnames__ = ["visitor"];
AST_ForIn.prototype._walk.__module__ = "ast_types";
undefined;
        AST_ForIn.prototype.__repr__ = function __repr__ () {
            if(AST_StatementWithBody.prototype.__repr__) return AST_StatementWithBody.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ForIn.prototype.__str__ = function __str__ () {
            if(AST_StatementWithBody.prototype.__str__) return AST_StatementWithBody.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ForIn.prototype, "__bases__", {value: [AST_StatementWithBody]});
        AST_ForIn.prototype.properties = {"init":"[AST_Node] the `for/in` initialization code","name":"[AST_SymbolRef?] the loop variable, only if `init` is AST_Var","object":"[AST_Node] the object that we're looping through"};

        function AST_ForJS() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ForJS.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ForJS, AST_StatementWithBody);
        AST_ForJS.prototype.__init__ = function __init__ () {
            AST_StatementWithBody.prototype.__init__ && AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        };
        AST_ForJS.prototype.__repr__ = function __repr__ () {
            if(AST_StatementWithBody.prototype.__repr__) return AST_StatementWithBody.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ForJS.prototype.__str__ = function __str__ () {
            if(AST_StatementWithBody.prototype.__str__) return AST_StatementWithBody.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ForJS.prototype, "__bases__", {value: [AST_StatementWithBody]});
        AST_ForJS.prototype.properties = {"condition":"[AST_Verbatim] raw JavaScript conditional"};

        function AST_EllipsesRange() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_EllipsesRange.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_EllipsesRange, AST_Node);
        AST_EllipsesRange.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_EllipsesRange.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_EllipsesRange.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_EllipsesRange.prototype, "__bases__", {value: [AST_Node]});
        AST_EllipsesRange.prototype.properties = {"first":"[AST_Node] the 'a' in [a..b] expression","last":"[AST_Node] the 'b' in [a..b] expression"};

        function AST_ListComprehension() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ListComprehension.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ListComprehension, AST_ForIn);
        AST_ListComprehension.prototype.__init__ = function __init__ () {
            AST_ForIn.prototype.__init__ && AST_ForIn.prototype.__init__.apply(this, arguments);
        };
        AST_ListComprehension.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_list_comprehension() {
                self.init._walk(visitor);
                self.object._walk(visitor);
                self.statement._walk(visitor);
                if (self.condition) {
                    self.condition._walk(visitor);
                }
            };
f_list_comprehension.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_list_comprehension);
        };
AST_ListComprehension.prototype._walk.__argnames__ = ["visitor"];
AST_ListComprehension.prototype._walk.__module__ = "ast_types";
undefined;
        AST_ListComprehension.prototype.__repr__ = function __repr__ () {
            if(AST_ForIn.prototype.__repr__) return AST_ForIn.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ListComprehension.prototype.__str__ = function __str__ () {
            if(AST_ForIn.prototype.__str__) return AST_ForIn.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ListComprehension.prototype, "__bases__", {value: [AST_ForIn]});
        AST_ListComprehension.prototype.properties = {"condition":"[AST_Node] the `if` condition","statement":"[AST_Node] statement to perform on each element before returning it"};

        function AST_SetComprehension() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SetComprehension.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SetComprehension, AST_ListComprehension);
        AST_SetComprehension.prototype.__init__ = function __init__ () {
            AST_ListComprehension.prototype.__init__ && AST_ListComprehension.prototype.__init__.apply(this, arguments);
        };
        AST_SetComprehension.prototype.__repr__ = function __repr__ () {
            if(AST_ListComprehension.prototype.__repr__) return AST_ListComprehension.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SetComprehension.prototype.__str__ = function __str__ () {
            if(AST_ListComprehension.prototype.__str__) return AST_ListComprehension.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SetComprehension.prototype, "__bases__", {value: [AST_ListComprehension]});

        function AST_DictComprehension() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_DictComprehension.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_DictComprehension, AST_ListComprehension);
        AST_DictComprehension.prototype.__init__ = function __init__ () {
            AST_ListComprehension.prototype.__init__ && AST_ListComprehension.prototype.__init__.apply(this, arguments);
        };
        AST_DictComprehension.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_dict_comprehension() {
                self.init._walk(visitor);
                self.object._walk(visitor);
                self.statement._walk(visitor);
                self.value_statement._walk(visitor);
                if (self.condition) {
                    self.condition._walk(visitor);
                }
            };
f_dict_comprehension.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_dict_comprehension);
        };
AST_DictComprehension.prototype._walk.__argnames__ = ["visitor"];
AST_DictComprehension.prototype._walk.__module__ = "ast_types";
undefined;
        AST_DictComprehension.prototype.__repr__ = function __repr__ () {
            if(AST_ListComprehension.prototype.__repr__) return AST_ListComprehension.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_DictComprehension.prototype.__str__ = function __str__ () {
            if(AST_ListComprehension.prototype.__str__) return AST_ListComprehension.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_DictComprehension.prototype, "__bases__", {value: [AST_ListComprehension]});
        AST_DictComprehension.prototype.properties = {"value_statement":"[AST_Node] statement to perform on each value before returning it","is_pydict":"[bool] True if this comprehension is for a python dict","is_jshash":"[bool] True if this comprehension is for a js hash"};

        function AST_GeneratorComprehension() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_GeneratorComprehension.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_GeneratorComprehension, AST_ListComprehension);
        AST_GeneratorComprehension.prototype.__init__ = function __init__ () {
            AST_ListComprehension.prototype.__init__ && AST_ListComprehension.prototype.__init__.apply(this, arguments);
        };
        AST_GeneratorComprehension.prototype.__repr__ = function __repr__ () {
            if(AST_ListComprehension.prototype.__repr__) return AST_ListComprehension.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_GeneratorComprehension.prototype.__str__ = function __str__ () {
            if(AST_ListComprehension.prototype.__str__) return AST_ListComprehension.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_GeneratorComprehension.prototype, "__bases__", {value: [AST_ListComprehension]});

        function AST_With() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_With.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_With, AST_StatementWithBody);
        AST_With.prototype.__init__ = function __init__ () {
            AST_StatementWithBody.prototype.__init__ && AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        };
        AST_With.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_with() {
                var exp;
                var ρσ_Iter12 = self.clauses;
                ρσ_Iter12 = ((typeof ρσ_Iter12[Symbol.iterator] === "function") ? (ρσ_Iter12 instanceof Map ? ρσ_Iter12.keys() : ρσ_Iter12) : Object.keys(ρσ_Iter12));
                for (var ρσ_Index12 of ρσ_Iter12) {
                    exp = ρσ_Index12;
                    exp._walk(visitor);
                }
                self.body._walk(visitor);
            };
f_with.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_with);
        };
AST_With.prototype._walk.__argnames__ = ["visitor"];
AST_With.prototype._walk.__module__ = "ast_types";
undefined;
        AST_With.prototype.__repr__ = function __repr__ () {
            if(AST_StatementWithBody.prototype.__repr__) return AST_StatementWithBody.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_With.prototype.__str__ = function __str__ () {
            if(AST_StatementWithBody.prototype.__str__) return AST_StatementWithBody.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_With.prototype, "__bases__", {value: [AST_StatementWithBody]});
        AST_With.prototype.properties = {"clauses":"[AST_WithClause*] the `with` clauses (comma separated)"};

        function AST_WithClause() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_WithClause.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_WithClause, AST_Node);
        AST_WithClause.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_WithClause.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_with_clause() {
                self.expression._walk(visitor);
                if (self.alias) {
                    self.alias._walk(visitor);
                }
            };
f_with_clause.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_with_clause);
        };
AST_WithClause.prototype._walk.__argnames__ = ["visitor"];
AST_WithClause.prototype._walk.__module__ = "ast_types";
undefined;
        AST_WithClause.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_WithClause.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_WithClause.prototype, "__bases__", {value: [AST_Node]});
        AST_WithClause.prototype.properties = {"expression":"[AST_Node] the expression","alias":"[AST_SymbolAlias?] optional alias for this expression"};

        function AST_Scope() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Scope.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Scope, AST_Block);
        AST_Scope.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Scope.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Scope.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Scope.prototype, "__bases__", {value: [AST_Block]});
        AST_Scope.prototype.properties = {"localvars":"[SymbolDef*] list of variables local to this scope","docstrings":"[AST_String*] list of docstrings for this scope"};

        function AST_Toplevel() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Toplevel.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Toplevel, AST_Scope);
        AST_Toplevel.prototype.__init__ = function __init__ () {
            AST_Scope.prototype.__init__ && AST_Scope.prototype.__init__.apply(this, arguments);
        };
        AST_Toplevel.prototype.__repr__ = function __repr__ () {
            if(AST_Scope.prototype.__repr__) return AST_Scope.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Toplevel.prototype.__str__ = function __str__ () {
            if(AST_Scope.prototype.__str__) return AST_Scope.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Toplevel.prototype, "__bases__", {value: [AST_Scope]});
        AST_Toplevel.prototype.properties = {"globals":"[Object/S] a map of name -> SymbolDef for all undeclared names","baselib":"[Object/s] a collection of used parts of baselib","imports":"[Object/S] a map of module_id->AST_Toplevel for all imported modules (this represents all imported modules across all source files)","imported_module_ids":"[string*] a list of module ids that were imported by this module, specifically","nonlocalvars":"[String*] a list of all non-local variable names (names that come from the global scope)","shebang":"[string] If #! line is present, it will be stored here","import_order":"[number] The global order in which this scope was imported","module_id":"[string] The id of this module","exports":"[SymbolDef*] list of names exported from this module","classes":"[Object/S] a map of class names to AST_Class for classes defined in this module","filename":"[string] The absolute path to the file from which this module was read","srchash":"[string] SHA1 hash of source code, used for caching","comments_after":"[array] True iff there were comments before this token"};

        function AST_Import() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Import.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Import, AST_Statement);
        AST_Import.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Import.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_import() {
                var arg;
                if (self.alias) {
                    self.alias._walk(visitor);
                }
                if (self.argnames) {
                    var ρσ_Iter13 = self.argnames;
                    ρσ_Iter13 = ((typeof ρσ_Iter13[Symbol.iterator] === "function") ? (ρσ_Iter13 instanceof Map ? ρσ_Iter13.keys() : ρσ_Iter13) : Object.keys(ρσ_Iter13));
                    for (var ρσ_Index13 of ρσ_Iter13) {
                        arg = ρσ_Index13;
                        arg._walk(visitor);
                    }
                }
            };
f_import.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_import);
        };
AST_Import.prototype._walk.__argnames__ = ["visitor"];
AST_Import.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Import.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Import.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Import.prototype, "__bases__", {value: [AST_Statement]});
        AST_Import.prototype.properties = {"module":"[AST_SymbolVar] name of the module we're importing","key":"[string] The key by which this module is stored in the global modules mapping","alias":"[AST_SymbolAlias] The name this module is imported as, can be None. For import x as y statements.","argnames":"[AST_ImportedVar*] names of objects to be imported","body":"[AST_TopLevel] parsed contents of the imported file"};

        function AST_Imports() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Imports.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Imports, AST_Statement);
        AST_Imports.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Imports.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_imports() {
                var imp;
                var ρσ_Iter14 = self.imports;
                ρσ_Iter14 = ((typeof ρσ_Iter14[Symbol.iterator] === "function") ? (ρσ_Iter14 instanceof Map ? ρσ_Iter14.keys() : ρσ_Iter14) : Object.keys(ρσ_Iter14));
                for (var ρσ_Index14 of ρσ_Iter14) {
                    imp = ρσ_Index14;
                    imp._walk(visitor);
                }
            };
f_imports.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_imports);
        };
AST_Imports.prototype._walk.__argnames__ = ["visitor"];
AST_Imports.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Imports.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Imports.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Imports.prototype, "__bases__", {value: [AST_Statement]});
        AST_Imports.prototype.properties = {"imports":"[AST_Import+] array of imports"};

        function AST_Decorator() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Decorator.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Decorator, AST_Node);
        AST_Decorator.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Decorator.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_decorator() {
                if (self.expression) {
                    self.expression.walk(visitor);
                }
            };
f_decorator.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_decorator);
        };
AST_Decorator.prototype._walk.__argnames__ = ["visitor"];
AST_Decorator.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Decorator.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Decorator.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Decorator.prototype, "__bases__", {value: [AST_Node]});
        AST_Decorator.prototype.properties = {"expression":"[AST_Node] the decorator expression"};

        function AST_Lambda() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Lambda.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Lambda, AST_Scope);
        AST_Lambda.prototype.__init__ = function __init__ () {
            AST_Scope.prototype.__init__ && AST_Scope.prototype.__init__.apply(this, arguments);
        };
        AST_Lambda.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_lambda() {
                var d, arg;
                if (self.decorators) {
                    var ρσ_Iter15 = self.decorators;
                    ρσ_Iter15 = ((typeof ρσ_Iter15[Symbol.iterator] === "function") ? (ρσ_Iter15 instanceof Map ? ρσ_Iter15.keys() : ρσ_Iter15) : Object.keys(ρσ_Iter15));
                    for (var ρσ_Index15 of ρσ_Iter15) {
                        d = ρσ_Index15;
                        d.walk(visitor);
                    }
                }
                if (self.name) {
                    self.name._walk(visitor);
                }
                var ρσ_Iter16 = self.argnames;
                ρσ_Iter16 = ((typeof ρσ_Iter16[Symbol.iterator] === "function") ? (ρσ_Iter16 instanceof Map ? ρσ_Iter16.keys() : ρσ_Iter16) : Object.keys(ρσ_Iter16));
                for (var ρσ_Index16 of ρσ_Iter16) {
                    arg = ρσ_Index16;
                    arg._walk(visitor);
                }
                if (self.argnames.starargs) {
                    self.argnames.starargs._walk(visitor);
                }
                if (self.argnames.kwargs) {
                    self.argnames.kwargs._walk(visitor);
                }
                (walk_body?.__call__?.bind(walk_body) ?? walk_body)(self, visitor);
            };
f_lambda.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_lambda);
        };
AST_Lambda.prototype._walk.__argnames__ = ["visitor"];
AST_Lambda.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Lambda.prototype.__repr__ = function __repr__ () {
            if(AST_Scope.prototype.__repr__) return AST_Scope.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Lambda.prototype.__str__ = function __str__ () {
            if(AST_Scope.prototype.__str__) return AST_Scope.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Lambda.prototype, "__bases__", {value: [AST_Scope]});
        AST_Lambda.prototype.properties = {"name":"[AST_SymbolDeclaration?] the name of this function","argnames":"[AST_SymbolFunarg*] array of function arguments","decorators":"[AST_Decorator*] function decorators, if any","annotations":"[bool*] True iff this function should have annotations set","is_generator":"[bool*] True iff this function is a generator","is_lambda":"[bool*] True iff this function is a Python lambda function","is_expression":"[bool*] True iff this function is a function expression","is_anonymous":"[bool*] True iff this function is an anonymous function","return_annotation":"[AST_Node?] The return type annotation provided (if any)"};

        function AST_Function() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Function.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Function, AST_Lambda);
        AST_Function.prototype.__init__ = function __init__ () {
            AST_Lambda.prototype.__init__ && AST_Lambda.prototype.__init__.apply(this, arguments);
        };
        AST_Function.prototype.__repr__ = function __repr__ () {
            if(AST_Lambda.prototype.__repr__) return AST_Lambda.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Function.prototype.__str__ = function __str__ () {
            if(AST_Lambda.prototype.__str__) return AST_Lambda.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Function.prototype, "__bases__", {value: [AST_Lambda]});

        function AST_Class() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Class.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Class, AST_Scope);
        AST_Class.prototype.__init__ = function __init__ () {
            AST_Scope.prototype.__init__ && AST_Scope.prototype.__init__.apply(this, arguments);
        };
        AST_Class.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_class() {
                var d;
                if (self.decorators) {
                    var ρσ_Iter17 = self.decorators;
                    ρσ_Iter17 = ((typeof ρσ_Iter17[Symbol.iterator] === "function") ? (ρσ_Iter17 instanceof Map ? ρσ_Iter17.keys() : ρσ_Iter17) : Object.keys(ρσ_Iter17));
                    for (var ρσ_Index17 of ρσ_Iter17) {
                        d = ρσ_Index17;
                        d.walk(visitor);
                    }
                }
                self.name._walk(visitor);
                (walk_body?.__call__?.bind(walk_body) ?? walk_body)(self, visitor);
                if (self.parent) {
                    self.parent._walk(visitor);
                }
            };
f_class.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_class);
        };
AST_Class.prototype._walk.__argnames__ = ["visitor"];
AST_Class.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Class.prototype.__repr__ = function __repr__ () {
            if(AST_Scope.prototype.__repr__) return AST_Scope.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Class.prototype.__str__ = function __str__ () {
            if(AST_Scope.prototype.__str__) return AST_Scope.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Class.prototype, "__bases__", {value: [AST_Scope]});
        AST_Class.prototype.properties = {"name":"[AST_SymbolDeclaration?] the name of this class","init":"[AST_Function] constructor for the class","parent":"[AST_Symbol?] parent class this class inherits from","bases":"[AST_Symbol*] list of base classes this class inherits from","static":"[dict] A hash whose keys are names of static methods for this class","external":"[boolean] true if class is declared elsewhere, but will be within current scope at runtime","bound":"[string*] list of methods that need to be bound to self","decorators":"[AST_Decorator*] function decorators, if any","module_id":"[string] The id of the module this class is defined in","statements":"[AST_Node*] list of statements in the class scope (excluding method definitions)","dynamic_properties":"[dict] map of dynamic property names to property descriptors of the form {getter:AST_Method, setter:AST_Method","classvars":"[dict] map containing all class variables as keys, to be used to easily test for existence of a class variable"};

        function AST_Method() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Method.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Method, AST_Lambda);
        AST_Method.prototype.__init__ = function __init__ () {
            AST_Lambda.prototype.__init__ && AST_Lambda.prototype.__init__.apply(this, arguments);
        };
        AST_Method.prototype.__repr__ = function __repr__ () {
            if(AST_Lambda.prototype.__repr__) return AST_Lambda.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Method.prototype.__str__ = function __str__ () {
            if(AST_Lambda.prototype.__str__) return AST_Lambda.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Method.prototype, "__bases__", {value: [AST_Lambda]});
        AST_Method.prototype.properties = {"static":"[boolean] true if method is static","is_getter":"[boolean] true if method is a property getter","is_setter":"[boolean] true if method is a property setter"};

        function AST_Jump() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Jump.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Jump, AST_Statement);
        AST_Jump.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Jump.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Jump.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Jump.prototype, "__bases__", {value: [AST_Statement]});

        function AST_Exit() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Exit.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Exit, AST_Jump);
        AST_Exit.prototype.__init__ = function __init__ () {
            AST_Jump.prototype.__init__ && AST_Jump.prototype.__init__.apply(this, arguments);
        };
        AST_Exit.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_exit() {
                if (self.value) {
                    self.value._walk(visitor);
                }
            };
f_exit.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_exit);
        };
AST_Exit.prototype._walk.__argnames__ = ["visitor"];
AST_Exit.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Exit.prototype.__repr__ = function __repr__ () {
            if(AST_Jump.prototype.__repr__) return AST_Jump.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Exit.prototype.__str__ = function __str__ () {
            if(AST_Jump.prototype.__str__) return AST_Jump.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Exit.prototype, "__bases__", {value: [AST_Jump]});
        AST_Exit.prototype.properties = {"value":"[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"};

        function AST_Return() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Return.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Return, AST_Exit);
        AST_Return.prototype.__init__ = function __init__ () {
            AST_Exit.prototype.__init__ && AST_Exit.prototype.__init__.apply(this, arguments);
        };
        AST_Return.prototype.__repr__ = function __repr__ () {
            if(AST_Exit.prototype.__repr__) return AST_Exit.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Return.prototype.__str__ = function __str__ () {
            if(AST_Exit.prototype.__str__) return AST_Exit.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Return.prototype, "__bases__", {value: [AST_Exit]});

        function AST_Yield() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Yield.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Yield, AST_Return);
        AST_Yield.prototype.__init__ = function __init__ () {
            AST_Return.prototype.__init__ && AST_Return.prototype.__init__.apply(this, arguments);
        };
        AST_Yield.prototype.__repr__ = function __repr__ () {
            if(AST_Return.prototype.__repr__) return AST_Return.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Yield.prototype.__str__ = function __str__ () {
            if(AST_Return.prototype.__str__) return AST_Return.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Yield.prototype, "__bases__", {value: [AST_Return]});
        AST_Yield.prototype.properties = {"is_yield_from":"[bool] True iff this is a yield from, False otherwise"};

        function AST_Throw() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Throw.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Throw, AST_Exit);
        AST_Throw.prototype.__init__ = function __init__ () {
            AST_Exit.prototype.__init__ && AST_Exit.prototype.__init__.apply(this, arguments);
        };
        AST_Throw.prototype.__repr__ = function __repr__ () {
            if(AST_Exit.prototype.__repr__) return AST_Exit.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Throw.prototype.__str__ = function __str__ () {
            if(AST_Exit.prototype.__str__) return AST_Exit.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Throw.prototype, "__bases__", {value: [AST_Exit]});

        function AST_LoopControl() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_LoopControl.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_LoopControl, AST_Jump);
        AST_LoopControl.prototype.__init__ = function __init__ () {
            AST_Jump.prototype.__init__ && AST_Jump.prototype.__init__.apply(this, arguments);
        };
        AST_LoopControl.prototype.__repr__ = function __repr__ () {
            if(AST_Jump.prototype.__repr__) return AST_Jump.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_LoopControl.prototype.__str__ = function __str__ () {
            if(AST_Jump.prototype.__str__) return AST_Jump.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_LoopControl.prototype, "__bases__", {value: [AST_Jump]});

        function AST_Break() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Break.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Break, AST_LoopControl);
        AST_Break.prototype.__init__ = function __init__ () {
            AST_LoopControl.prototype.__init__ && AST_LoopControl.prototype.__init__.apply(this, arguments);
        };
        AST_Break.prototype.__repr__ = function __repr__ () {
            if(AST_LoopControl.prototype.__repr__) return AST_LoopControl.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Break.prototype.__str__ = function __str__ () {
            if(AST_LoopControl.prototype.__str__) return AST_LoopControl.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Break.prototype, "__bases__", {value: [AST_LoopControl]});

        function AST_Continue() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Continue.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Continue, AST_LoopControl);
        AST_Continue.prototype.__init__ = function __init__ () {
            AST_LoopControl.prototype.__init__ && AST_LoopControl.prototype.__init__.apply(this, arguments);
        };
        AST_Continue.prototype.__repr__ = function __repr__ () {
            if(AST_LoopControl.prototype.__repr__) return AST_LoopControl.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Continue.prototype.__str__ = function __str__ () {
            if(AST_LoopControl.prototype.__str__) return AST_LoopControl.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Continue.prototype, "__bases__", {value: [AST_LoopControl]});

        function AST_If() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_If.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_If, AST_StatementWithBody);
        AST_If.prototype.__init__ = function __init__ () {
            AST_StatementWithBody.prototype.__init__ && AST_StatementWithBody.prototype.__init__.apply(this, arguments);
        };
        AST_If.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_if() {
                self.condition._walk(visitor);
                self.body._walk(visitor);
                if (self.alternative) {
                    self.alternative._walk(visitor);
                }
            };
f_if.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_if);
        };
AST_If.prototype._walk.__argnames__ = ["visitor"];
AST_If.prototype._walk.__module__ = "ast_types";
undefined;
        AST_If.prototype.__repr__ = function __repr__ () {
            if(AST_StatementWithBody.prototype.__repr__) return AST_StatementWithBody.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_If.prototype.__str__ = function __str__ () {
            if(AST_StatementWithBody.prototype.__str__) return AST_StatementWithBody.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_If.prototype, "__bases__", {value: [AST_StatementWithBody]});
        AST_If.prototype.properties = {"condition":"[AST_Node] the `if` condition","alternative":"[AST_Statement?] the `else` part, or null if not present"};

        function AST_Try() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Try.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Try, AST_Block);
        AST_Try.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Try.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_try() {
                (walk_body?.__call__?.bind(walk_body) ?? walk_body)(self, visitor);
                if (self.bcatch) {
                    self.bcatch._walk(visitor);
                }
                if (self.belse) {
                    self.belse._walk(visitor);
                }
                if (self.bfinally) {
                    self.bfinally._walk(visitor);
                }
            };
f_try.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_try);
        };
AST_Try.prototype._walk.__argnames__ = ["visitor"];
AST_Try.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Try.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Try.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Try.prototype, "__bases__", {value: [AST_Block]});
        AST_Try.prototype.properties = {"bcatch":"[AST_Catch?] the catch block, or null if not present","bfinally":"[AST_Finally?] the finally block, or null if not present","belse":"[AST_Else?] the else block for null if not present"};

        function AST_Catch() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Catch.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Catch, AST_Block);
        AST_Catch.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Catch.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Catch.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Catch.prototype, "__bases__", {value: [AST_Block]});

        function AST_Except() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Except.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Except, AST_Block);
        AST_Except.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Except.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_except() {
                var e;
                if (self.argname) {
                    self.argname.walk(visitor);
                }
                if (self.errors) {
                    var ρσ_Iter18 = self.errors;
                    ρσ_Iter18 = ((typeof ρσ_Iter18[Symbol.iterator] === "function") ? (ρσ_Iter18 instanceof Map ? ρσ_Iter18.keys() : ρσ_Iter18) : Object.keys(ρσ_Iter18));
                    for (var ρσ_Index18 of ρσ_Iter18) {
                        e = ρσ_Index18;
                        e.walk(visitor);
                    }
                }
                (walk_body?.__call__?.bind(walk_body) ?? walk_body)(self, visitor);
            };
f_except.__module__ = "ast_types";
undefined;

            return visitor._visit(this, f_except);
        };
AST_Except.prototype._walk.__argnames__ = ["visitor"];
AST_Except.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Except.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Except.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Except.prototype, "__bases__", {value: [AST_Block]});
        AST_Except.prototype.properties = {"argname":"[AST_SymbolCatch] symbol for the exception","errors":"[AST_SymbolVar*] error classes to catch in this block"};

        function AST_Finally() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Finally.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Finally, AST_Block);
        AST_Finally.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Finally.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Finally.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Finally.prototype, "__bases__", {value: [AST_Block]});

        function AST_Else() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Else.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Else, AST_Block);
        AST_Else.prototype.__init__ = function __init__ () {
            AST_Block.prototype.__init__ && AST_Block.prototype.__init__.apply(this, arguments);
        };
        AST_Else.prototype.__repr__ = function __repr__ () {
            if(AST_Block.prototype.__repr__) return AST_Block.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Else.prototype.__str__ = function __str__ () {
            if(AST_Block.prototype.__str__) return AST_Block.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Else.prototype, "__bases__", {value: [AST_Block]});

        function AST_Definitions() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Definitions.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Definitions, AST_Statement);
        AST_Definitions.prototype.__init__ = function __init__ () {
            AST_Statement.prototype.__init__ && AST_Statement.prototype.__init__.apply(this, arguments);
        };
        AST_Definitions.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_definitions() {
                var def_;
                var ρσ_Iter19 = self.definitions;
                ρσ_Iter19 = ((typeof ρσ_Iter19[Symbol.iterator] === "function") ? (ρσ_Iter19 instanceof Map ? ρσ_Iter19.keys() : ρσ_Iter19) : Object.keys(ρσ_Iter19));
                for (var ρσ_Index19 of ρσ_Iter19) {
                    def_ = ρσ_Index19;
                    def_._walk(visitor);
                }
            };
f_definitions.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_definitions);
        };
AST_Definitions.prototype._walk.__argnames__ = ["visitor"];
AST_Definitions.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Definitions.prototype.__repr__ = function __repr__ () {
            if(AST_Statement.prototype.__repr__) return AST_Statement.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Definitions.prototype.__str__ = function __str__ () {
            if(AST_Statement.prototype.__str__) return AST_Statement.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Definitions.prototype, "__bases__", {value: [AST_Statement]});
        AST_Definitions.prototype.properties = {"definitions":"[AST_VarDef*] array of variable definitions"};

        function AST_Var() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Var.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Var, AST_Definitions);
        AST_Var.prototype.__init__ = function __init__ () {
            AST_Definitions.prototype.__init__ && AST_Definitions.prototype.__init__.apply(this, arguments);
        };
        AST_Var.prototype.__repr__ = function __repr__ () {
            if(AST_Definitions.prototype.__repr__) return AST_Definitions.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Var.prototype.__str__ = function __str__ () {
            if(AST_Definitions.prototype.__str__) return AST_Definitions.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Var.prototype, "__bases__", {value: [AST_Definitions]});

        function AST_VarDef() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_VarDef.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_VarDef, AST_Node);
        AST_VarDef.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_VarDef.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_var_def() {
                self.name._walk(visitor);
                if (self.value) {
                    self.value._walk(visitor);
                }
            };
f_var_def.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_var_def);
        };
AST_VarDef.prototype._walk.__argnames__ = ["visitor"];
AST_VarDef.prototype._walk.__module__ = "ast_types";
undefined;
        AST_VarDef.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_VarDef.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_VarDef.prototype, "__bases__", {value: [AST_Node]});
        AST_VarDef.prototype.properties = {"name":"[AST_SymbolVar|AST_SymbolNonlocal] name of the variable","value":"[AST_Node?] initializer, or null if there's no initializer"};

        function AST_BaseCall() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_BaseCall.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_BaseCall, AST_Node);
        AST_BaseCall.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_BaseCall.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_BaseCall.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_BaseCall.prototype, "__bases__", {value: [AST_Node]});
        AST_BaseCall.prototype.properties = {"args":"[AST_Node*] array of arguments"};

        function AST_Call() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Call.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Call, AST_BaseCall);
        AST_Call.prototype.__init__ = function __init__ () {
            AST_BaseCall.prototype.__init__ && AST_BaseCall.prototype.__init__.apply(this, arguments);
        };
        AST_Call.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_call() {
                var arg;
                self.expression._walk(visitor);
                var ρσ_Iter20 = self.args;
                ρσ_Iter20 = ((typeof ρσ_Iter20[Symbol.iterator] === "function") ? (ρσ_Iter20 instanceof Map ? ρσ_Iter20.keys() : ρσ_Iter20) : Object.keys(ρσ_Iter20));
                for (var ρσ_Index20 of ρσ_Iter20) {
                    arg = ρσ_Index20;
                    arg._walk(visitor);
                }
                if (self.args.kwargs) {
                    var ρσ_Iter21 = self.args.kwargs;
                    ρσ_Iter21 = ((typeof ρσ_Iter21[Symbol.iterator] === "function") ? (ρσ_Iter21 instanceof Map ? ρσ_Iter21.keys() : ρσ_Iter21) : Object.keys(ρσ_Iter21));
                    for (var ρσ_Index21 of ρσ_Iter21) {
                        arg = ρσ_Index21;
                        arg[0]._walk(visitor);
                        arg[1]._walk(visitor);
                    }
                }
                if (self.args.kwarg_items) {
                    var ρσ_Iter22 = self.args.kwarg_items;
                    ρσ_Iter22 = ((typeof ρσ_Iter22[Symbol.iterator] === "function") ? (ρσ_Iter22 instanceof Map ? ρσ_Iter22.keys() : ρσ_Iter22) : Object.keys(ρσ_Iter22));
                    for (var ρσ_Index22 of ρσ_Iter22) {
                        arg = ρσ_Index22;
                        arg._walk(visitor);
                    }
                }
            };
f_call.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_call);
        };
AST_Call.prototype._walk.__argnames__ = ["visitor"];
AST_Call.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Call.prototype.__repr__ = function __repr__ () {
            if(AST_BaseCall.prototype.__repr__) return AST_BaseCall.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Call.prototype.__str__ = function __str__ () {
            if(AST_BaseCall.prototype.__str__) return AST_BaseCall.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Call.prototype, "__bases__", {value: [AST_BaseCall]});
        AST_Call.prototype.properties = {"expression":"[AST_Node] expression to invoke as function"};

        function AST_ClassCall() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ClassCall.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ClassCall, AST_BaseCall);
        AST_ClassCall.prototype.__init__ = function __init__ () {
            AST_BaseCall.prototype.__init__ && AST_BaseCall.prototype.__init__.apply(this, arguments);
        };
        AST_ClassCall.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_class_call() {
                var arg;
                if (self.expression) {
                    self.expression._walk(visitor);
                }
                var ρσ_Iter23 = self.args;
                ρσ_Iter23 = ((typeof ρσ_Iter23[Symbol.iterator] === "function") ? (ρσ_Iter23 instanceof Map ? ρσ_Iter23.keys() : ρσ_Iter23) : Object.keys(ρσ_Iter23));
                for (var ρσ_Index23 of ρσ_Iter23) {
                    arg = ρσ_Index23;
                    arg._walk(visitor);
                }
                var ρσ_Iter24 = self.args.kwargs;
                ρσ_Iter24 = ((typeof ρσ_Iter24[Symbol.iterator] === "function") ? (ρσ_Iter24 instanceof Map ? ρσ_Iter24.keys() : ρσ_Iter24) : Object.keys(ρσ_Iter24));
                for (var ρσ_Index24 of ρσ_Iter24) {
                    arg = ρσ_Index24;
                    arg[0]._walk(visitor);
                    arg[1]._walk(visitor);
                }
                var ρσ_Iter25 = self.args.kwarg_items;
                ρσ_Iter25 = ((typeof ρσ_Iter25[Symbol.iterator] === "function") ? (ρσ_Iter25 instanceof Map ? ρσ_Iter25.keys() : ρσ_Iter25) : Object.keys(ρσ_Iter25));
                for (var ρσ_Index25 of ρσ_Iter25) {
                    arg = ρσ_Index25;
                    arg._walk(visitor);
                }
            };
f_class_call.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_class_call);
        };
AST_ClassCall.prototype._walk.__argnames__ = ["visitor"];
AST_ClassCall.prototype._walk.__module__ = "ast_types";
undefined;
        AST_ClassCall.prototype.__repr__ = function __repr__ () {
            if(AST_BaseCall.prototype.__repr__) return AST_BaseCall.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ClassCall.prototype.__str__ = function __str__ () {
            if(AST_BaseCall.prototype.__str__) return AST_BaseCall.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ClassCall.prototype, "__bases__", {value: [AST_BaseCall]});
        AST_ClassCall.prototype.properties = {"class":"[string] name of the class method belongs to","method":"[string] class method being called","static":"[boolean] defines whether the method is static"};

        function AST_New() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_New.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_New, AST_Call);
        AST_New.prototype.__init__ = function __init__ () {
            AST_Call.prototype.__init__ && AST_Call.prototype.__init__.apply(this, arguments);
        };
        AST_New.prototype.__repr__ = function __repr__ () {
            if(AST_Call.prototype.__repr__) return AST_Call.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_New.prototype.__str__ = function __str__ () {
            if(AST_Call.prototype.__str__) return AST_Call.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_New.prototype, "__bases__", {value: [AST_Call]});

        function AST_Seq() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Seq.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Seq, AST_Node);
        AST_Seq.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Seq.prototype.to_array = function to_array() {
            var self = this;
            var p, a;
            p = self;
            a = ρσ_list_decorate([]);
            while (p) {
                a.push(p.car);
                if (p.cdr && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p.cdr, AST_Seq))) {
                    a.push(p.cdr);
                    break;
                }
                p = p.cdr;
            }
            return a;
        };
AST_Seq.prototype.to_array.__module__ = "ast_types";
undefined;
        AST_Seq.prototype.add = function add(node) {
            var self = this;
            var p, cell;
            p = self;
            while (p) {
                if (!((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p.cdr, AST_Seq))) {
                    cell = AST_Seq.prototype.cons.call(p.cdr, node);
                    p.cdr = cell;
                    return p.cdr;
                }
                p = p.cdr;
            }
        };
AST_Seq.prototype.add.__argnames__ = ["node"];
AST_Seq.prototype.add.__module__ = "ast_types";
undefined;
        AST_Seq.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_seq() {
                self.car._walk(visitor);
                if (self.cdr) {
                    self.cdr._walk(visitor);
                }
            };
f_seq.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_seq);
        };
AST_Seq.prototype._walk.__argnames__ = ["visitor"];
AST_Seq.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Seq.prototype.cons = function cons(x, y) {
            var self = this;
            var seq;
            seq = new AST_Seq(x);
            seq.car = x;
            seq.cdr = y;
            return seq;
        };
AST_Seq.prototype.cons.__argnames__ = ["x", "y"];
AST_Seq.prototype.cons.__module__ = "ast_types";
undefined;
        AST_Seq.prototype.from_array = function from_array(array) {
            var self = this;
            var ans, i, p;
            if (array.length === 0) {
                return null;
            }
            if (array.length === 1) {
                return array[0].clone();
            }
            ans = null;
            for (var ρσ_Index26 = ρσ_operator_sub(array.length, 1); ρσ_Index26 > -1; ρσ_Index26-=1) {
                i = ρσ_Index26;
                ans = AST_Seq.prototype.cons.call(array[(typeof i === "number" && i < 0) ? array.length + i : i], ans);
            }
            p = ans;
            while (p) {
                if (p.cdr && !p.cdr.cdr) {
                    p.cdr = p.cdr.car;
                    break;
                }
                p = p.cdr;
            }
            return ans;
        };
AST_Seq.prototype.from_array.__argnames__ = ["array"];
AST_Seq.prototype.from_array.__module__ = "ast_types";
undefined;
        AST_Seq.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Seq.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Seq.prototype, "__bases__", {value: [AST_Node]});
        AST_Seq.prototype.properties = {"car":"[AST_Node] first element in sequence","cdr":"[AST_Node] second element in sequence"};

        function AST_PropAccess() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_PropAccess.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_PropAccess, AST_Node);
        AST_PropAccess.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_PropAccess.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_PropAccess.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_PropAccess.prototype, "__bases__", {value: [AST_Node]});
        AST_PropAccess.prototype.properties = {"expression":"[AST_Node] the “container” expression","property":"[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node"};

        function AST_Dot() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Dot.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Dot, AST_PropAccess);
        AST_Dot.prototype.__init__ = function __init__ () {
            AST_PropAccess.prototype.__init__ && AST_PropAccess.prototype.__init__.apply(this, arguments);
        };
        AST_Dot.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return self.expression._walk(visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_Dot.prototype._walk.__argnames__ = ["visitor"];
AST_Dot.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Dot.prototype.__repr__ = function __repr__ () {
            if(AST_PropAccess.prototype.__repr__) return AST_PropAccess.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Dot.prototype.__str__ = function __str__ () {
            if(AST_PropAccess.prototype.__str__) return AST_PropAccess.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Dot.prototype, "__bases__", {value: [AST_PropAccess]});

        function AST_Sub() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Sub.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Sub, AST_PropAccess);
        AST_Sub.prototype.__init__ = function __init__ () {
            AST_PropAccess.prototype.__init__ && AST_PropAccess.prototype.__init__.apply(this, arguments);
        };
        AST_Sub.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_sub() {
                self.expression._walk(visitor);
                self.property._walk(visitor);
            };
f_sub.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_sub);
        };
AST_Sub.prototype._walk.__argnames__ = ["visitor"];
AST_Sub.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Sub.prototype.__repr__ = function __repr__ () {
            if(AST_PropAccess.prototype.__repr__) return AST_PropAccess.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Sub.prototype.__str__ = function __str__ () {
            if(AST_PropAccess.prototype.__str__) return AST_PropAccess.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Sub.prototype, "__bases__", {value: [AST_PropAccess]});

        function AST_ItemAccess() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ItemAccess.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ItemAccess, AST_PropAccess);
        AST_ItemAccess.prototype.__init__ = function __init__ () {
            AST_PropAccess.prototype.__init__ && AST_PropAccess.prototype.__init__.apply(this, arguments);
        };
        AST_ItemAccess.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_item_access() {
                self.expression._walk(visitor);
                self.property._walk(visitor);
                if (self.assignment) {
                    self.assignment._walk(visitor);
                }
            };
f_item_access.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_item_access);
        };
AST_ItemAccess.prototype._walk.__argnames__ = ["visitor"];
AST_ItemAccess.prototype._walk.__module__ = "ast_types";
undefined;
        AST_ItemAccess.prototype.__repr__ = function __repr__ () {
            if(AST_PropAccess.prototype.__repr__) return AST_PropAccess.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ItemAccess.prototype.__str__ = function __str__ () {
            if(AST_PropAccess.prototype.__str__) return AST_PropAccess.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ItemAccess.prototype, "__bases__", {value: [AST_PropAccess]});
        AST_ItemAccess.prototype.properties = {"assignment":"[AST_Node or None] Not None if this is an assignment (a[x] = y) rather than a simple access"};

        function AST_Splice() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Splice.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Splice, AST_PropAccess);
        AST_Splice.prototype.__init__ = function __init__ () {
            AST_PropAccess.prototype.__init__ && AST_PropAccess.prototype.__init__.apply(this, arguments);
        };
        AST_Splice.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_prop_access() {
                self.expression._walk(visitor);
                self.property._walk(visitor);
                self.property2._walk(visitor);
            };
f_prop_access.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_prop_access);
        };
AST_Splice.prototype._walk.__argnames__ = ["visitor"];
AST_Splice.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Splice.prototype.__repr__ = function __repr__ () {
            if(AST_PropAccess.prototype.__repr__) return AST_PropAccess.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Splice.prototype.__str__ = function __str__ () {
            if(AST_PropAccess.prototype.__str__) return AST_PropAccess.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Splice.prototype, "__bases__", {value: [AST_PropAccess]});
        AST_Splice.prototype.properties = {"property2":"[AST_Node] the 2nd property to access - typically ending index for the array.","assignment":"[AST_Node] The data being spliced in."};

        function AST_Unary() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Unary.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Unary, AST_Node);
        AST_Unary.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Unary.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return self.expression._walk(visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_Unary.prototype._walk.__argnames__ = ["visitor"];
AST_Unary.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Unary.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Unary.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Unary.prototype, "__bases__", {value: [AST_Node]});
        AST_Unary.prototype.properties = {"operator":"[string] the operator","expression":"[AST_Node] expression that this unary operator applies to","parenthesized":"[bool] Whether this unary expression was parenthesized"};

        function AST_UnaryPrefix() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_UnaryPrefix.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_UnaryPrefix, AST_Unary);
        AST_UnaryPrefix.prototype.__init__ = function __init__ () {
            AST_Unary.prototype.__init__ && AST_Unary.prototype.__init__.apply(this, arguments);
        };
        AST_UnaryPrefix.prototype.__repr__ = function __repr__ () {
            if(AST_Unary.prototype.__repr__) return AST_Unary.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_UnaryPrefix.prototype.__str__ = function __str__ () {
            if(AST_Unary.prototype.__str__) return AST_Unary.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_UnaryPrefix.prototype, "__bases__", {value: [AST_Unary]});

        function AST_Binary() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Binary.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Binary, AST_Node);
        AST_Binary.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Binary.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return ρσ_list_decorate([ self.left._walk(visitor), self.right._walk(visitor) ]);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_Binary.prototype._walk.__argnames__ = ["visitor"];
AST_Binary.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Binary.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Binary.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Binary.prototype, "__bases__", {value: [AST_Node]});
        AST_Binary.prototype.properties = {"left":"[AST_Node] left-hand side expression","operator":"[string] the operator","right":"[AST_Node] right-hand side expression"};

        function AST_Existential() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Existential.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Existential, AST_Node);
        AST_Existential.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Existential.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_existential() {
                self.expression._walk(visitor);
                if (self.after !== null && typeof self.after === "object") {
                    self.after._walk(visitor);
                }
            };
f_existential.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_existential);
        };
AST_Existential.prototype._walk.__argnames__ = ["visitor"];
AST_Existential.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Existential.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Existential.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Existential.prototype, "__bases__", {value: [AST_Node]});
        AST_Existential.prototype.properties = {"expression":"[AST_Node] The expression whose existence we need to check","after":"[None|string|AST_Node] is None when there is nothing following this operator, is a string when there is as AST_PropAccess following this operator, is an AST_Node if it is used a a shorthand for the conditional ternary, i.e. a ? b == a if a? else b"};

        function AST_Conditional() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Conditional.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Conditional, AST_Node);
        AST_Conditional.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Conditional.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_conditional() {
                self.condition._walk(visitor);
                self.consequent._walk(visitor);
                self.alternative._walk(visitor);
            };
f_conditional.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_conditional);
        };
AST_Conditional.prototype._walk.__argnames__ = ["visitor"];
AST_Conditional.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Conditional.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Conditional.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Conditional.prototype, "__bases__", {value: [AST_Node]});
        AST_Conditional.prototype.properties = {"condition":"[AST_Node]","consequent":"[AST_Node]","alternative":"[AST_Node]"};

        function AST_Assign() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Assign.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Assign, AST_Binary);
        AST_Assign.prototype.__init__ = function __init__ () {
            AST_Binary.prototype.__init__ && AST_Binary.prototype.__init__.apply(this, arguments);
        };
        AST_Assign.prototype.is_chained = function is_chained() {
            var self = this;
            return (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right, AST_Assign) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right, AST_Seq) && ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right.car, AST_Assign) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right.cdr, AST_Assign));
        };
AST_Assign.prototype.is_chained.__module__ = "ast_types";
undefined;
        AST_Assign.prototype.traverse_chain = function traverse_chain() {
            var self = this;
            var right, left_hand_sides, next, assign;
            right = self.right;
            while (true) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right, AST_Assign)) {
                    right = right.right;
                    continue;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right, AST_Seq)) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right.car, AST_Assign)) {
                        right = new AST_Seq({"car":right.car.right,"cdr":right.cdr});
                        continue;
                    }
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right.cdr, AST_Assign)) {
                        right = right.cdr.right;
                        continue;
                    }
                }
                break;
            }
            left_hand_sides = [self.left];
            next = self.right;
            while (true) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(next, AST_Assign)) {
                    left_hand_sides.push(next.left);
                    next = next.right;
                    continue;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(next, AST_Seq)) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(next.cdr, AST_Assign)) {
                        assign = next.cdr;
                        left_hand_sides.push(new AST_Seq({"car":next.car,"cdr":assign.left}));
                        next = assign.right;
                        continue;
                    }
                }
                break;
            }
            return [left_hand_sides, right];
        };
AST_Assign.prototype.traverse_chain.__module__ = "ast_types";
undefined;
        AST_Assign.prototype.__repr__ = function __repr__ () {
            if(AST_Binary.prototype.__repr__) return AST_Binary.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Assign.prototype.__str__ = function __str__ () {
            if(AST_Binary.prototype.__str__) return AST_Binary.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Assign.prototype, "__bases__", {value: [AST_Binary]});

        function AST_Array() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Array.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Array, AST_Node);
        AST_Array.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Array.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_array() {
                var el;
                var ρσ_Iter27 = self.elements;
                ρσ_Iter27 = ((typeof ρσ_Iter27[Symbol.iterator] === "function") ? (ρσ_Iter27 instanceof Map ? ρσ_Iter27.keys() : ρσ_Iter27) : Object.keys(ρσ_Iter27));
                for (var ρσ_Index27 of ρσ_Iter27) {
                    el = ρσ_Index27;
                    el._walk(visitor);
                }
            };
f_array.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_array);
        };
AST_Array.prototype._walk.__argnames__ = ["visitor"];
AST_Array.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Array.prototype.flatten = function flatten() {
            var self = this;
            function flatten(arr) {
                var ans, value;
                ans = ρσ_list_decorate([]);
                var ρσ_Iter28 = arr;
                ρσ_Iter28 = ((typeof ρσ_Iter28[Symbol.iterator] === "function") ? (ρσ_Iter28 instanceof Map ? ρσ_Iter28.keys() : ρσ_Iter28) : Object.keys(ρσ_Iter28));
                for (var ρσ_Index28 of ρσ_Iter28) {
                    value = ρσ_Index28;
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(value, AST_Seq)) {
                        value = value.to_array();
                    } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(value, AST_Array)) {
                        value = value.elements;
                    }
                    if (Array.isArray(value)) {
                        ans = ans.concat((flatten?.__call__?.bind(flatten) ?? flatten)(value));
                    } else {
                        ans.push(value);
                    }
                }
                return ans;
            };
flatten.__argnames__ = ["arr"];
flatten.__module__ = "ast_types";
undefined;

            return (flatten?.__call__?.bind(flatten) ?? flatten)(self.elements);
        };
AST_Array.prototype.flatten.__module__ = "ast_types";
undefined;
        AST_Array.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Array.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Array.prototype, "__bases__", {value: [AST_Node]});
        AST_Array.prototype.properties = {"elements":"[AST_Node*] array of elements"};

        function AST_Object() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Object.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Object, AST_Node);
        AST_Object.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Object.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_object() {
                var prop;
                var ρσ_Iter29 = self.properties;
                ρσ_Iter29 = ((typeof ρσ_Iter29[Symbol.iterator] === "function") ? (ρσ_Iter29 instanceof Map ? ρσ_Iter29.keys() : ρσ_Iter29) : Object.keys(ρσ_Iter29));
                for (var ρσ_Index29 of ρσ_Iter29) {
                    prop = ρσ_Index29;
                    prop._walk(visitor);
                }
            };
f_object.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_object);
        };
AST_Object.prototype._walk.__argnames__ = ["visitor"];
AST_Object.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Object.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Object.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Object.prototype, "__bases__", {value: [AST_Node]});
        AST_Object.prototype.properties = {"properties":"[AST_ObjectProperty*] array of properties","is_pydict":"[bool] True if this object is a python dict literal","is_jshash":"[bool] True if this object is a js hash literal"};

        function AST_ExpressiveObject() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ExpressiveObject.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ExpressiveObject, AST_Object);
        AST_ExpressiveObject.prototype.__init__ = function __init__ () {
            AST_Object.prototype.__init__ && AST_Object.prototype.__init__.apply(this, arguments);
        };
        AST_ExpressiveObject.prototype.__repr__ = function __repr__ () {
            if(AST_Object.prototype.__repr__) return AST_Object.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ExpressiveObject.prototype.__str__ = function __str__ () {
            if(AST_Object.prototype.__str__) return AST_Object.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ExpressiveObject.prototype, "__bases__", {value: [AST_Object]});

        function AST_ObjectProperty() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ObjectProperty.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ObjectProperty, AST_Node);
        AST_ObjectProperty.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_ObjectProperty.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_object_property() {
                self.key._walk(visitor);
                self.value._walk(visitor);
            };
f_object_property.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_object_property);
        };
AST_ObjectProperty.prototype._walk.__argnames__ = ["visitor"];
AST_ObjectProperty.prototype._walk.__module__ = "ast_types";
undefined;
        AST_ObjectProperty.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ObjectProperty.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ObjectProperty.prototype, "__bases__", {value: [AST_Node]});
        AST_ObjectProperty.prototype.properties = {"key":"[AST_Node] the property expression","value":"[AST_Node] property value.  For setters and getters this is an AST_Function.","quoted":""};

        function AST_ObjectKeyVal() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ObjectKeyVal.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ObjectKeyVal, AST_ObjectProperty);
        AST_ObjectKeyVal.prototype.__init__ = function __init__ () {
            AST_ObjectProperty.prototype.__init__ && AST_ObjectProperty.prototype.__init__.apply(this, arguments);
        };
        AST_ObjectKeyVal.prototype.__repr__ = function __repr__ () {
            if(AST_ObjectProperty.prototype.__repr__) return AST_ObjectProperty.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ObjectKeyVal.prototype.__str__ = function __str__ () {
            if(AST_ObjectProperty.prototype.__str__) return AST_ObjectProperty.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ObjectKeyVal.prototype, "__bases__", {value: [AST_ObjectProperty]});

        function AST_Set() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Set.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Set, AST_Node);
        AST_Set.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Set.prototype._walk = function _walk(visitor) {
            var self = this;
            function f_node() {
                var prop;
                var ρσ_Iter30 = self.items;
                ρσ_Iter30 = ((typeof ρσ_Iter30[Symbol.iterator] === "function") ? (ρσ_Iter30 instanceof Map ? ρσ_Iter30.keys() : ρσ_Iter30) : Object.keys(ρσ_Iter30));
                for (var ρσ_Index30 of ρσ_Iter30) {
                    prop = ρσ_Index30;
                    prop._walk(visitor);
                }
            };
f_node.__module__ = "ast_types";
undefined;

            return visitor._visit(self, f_node);
        };
AST_Set.prototype._walk.__argnames__ = ["visitor"];
AST_Set.prototype._walk.__module__ = "ast_types";
undefined;
        AST_Set.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Set.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Set.prototype, "__bases__", {value: [AST_Node]});
        AST_Set.prototype.properties = {"items":"[AST_SetItem*] array of items"};

        function AST_SetItem() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SetItem.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SetItem, AST_Node);
        AST_SetItem.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_SetItem.prototype._walk = function _walk(visitor) {
            var self = this;
            return visitor._visit(self, (function() {
                var ρσ_anonfunc = function () {
                    return self.value._walk(visitor);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })());
        };
AST_SetItem.prototype._walk.__argnames__ = ["visitor"];
AST_SetItem.prototype._walk.__module__ = "ast_types";
undefined;
        AST_SetItem.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SetItem.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SetItem.prototype, "__bases__", {value: [AST_Node]});
        AST_SetItem.prototype.properties = {"value":"[AST_Node] The value of this item"};

        function AST_Symbol() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Symbol.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Symbol, AST_Node);
        AST_Symbol.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Symbol.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Symbol.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Symbol.prototype, "__bases__", {value: [AST_Node]});
        AST_Symbol.prototype.properties = {"name":"[string] name of this symbol","scope":"[AST_Scope/S] the current scope (not necessarily the definition scope)","thedef":"[SymbolDef/S] the definition of this symbol"};

        function AST_SymbolAlias() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolAlias.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolAlias, AST_Symbol);
        AST_SymbolAlias.prototype.__init__ = function __init__ () {
            AST_Symbol.prototype.__init__ && AST_Symbol.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolAlias.prototype.__repr__ = function __repr__ () {
            if(AST_Symbol.prototype.__repr__) return AST_Symbol.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolAlias.prototype.__str__ = function __str__ () {
            if(AST_Symbol.prototype.__str__) return AST_Symbol.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolAlias.prototype, "__bases__", {value: [AST_Symbol]});

        function AST_SymbolDeclaration() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolDeclaration, AST_Symbol);
        AST_SymbolDeclaration.prototype.__init__ = function __init__ () {
            AST_Symbol.prototype.__init__ && AST_Symbol.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolDeclaration.prototype.__repr__ = function __repr__ () {
            if(AST_Symbol.prototype.__repr__) return AST_Symbol.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolDeclaration.prototype.__str__ = function __str__ () {
            if(AST_Symbol.prototype.__str__) return AST_Symbol.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolDeclaration.prototype, "__bases__", {value: [AST_Symbol]});
        AST_SymbolDeclaration.prototype.properties = {"init":"[AST_Node*/S] array of initializers for this declaration."};

        function AST_SymbolVar() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolVar.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolVar, AST_SymbolDeclaration);
        AST_SymbolVar.prototype.__init__ = function __init__ () {
            AST_SymbolDeclaration.prototype.__init__ && AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolVar.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolDeclaration.prototype.__repr__) return AST_SymbolDeclaration.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolVar.prototype.__str__ = function __str__ () {
            if(AST_SymbolDeclaration.prototype.__str__) return AST_SymbolDeclaration.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolVar.prototype, "__bases__", {value: [AST_SymbolDeclaration]});

        function AST_ImportedVar() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_ImportedVar.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_ImportedVar, AST_SymbolVar);
        AST_ImportedVar.prototype.__init__ = function __init__ () {
            AST_SymbolVar.prototype.__init__ && AST_SymbolVar.prototype.__init__.apply(this, arguments);
        };
        AST_ImportedVar.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolVar.prototype.__repr__) return AST_SymbolVar.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_ImportedVar.prototype.__str__ = function __str__ () {
            if(AST_SymbolVar.prototype.__str__) return AST_SymbolVar.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_ImportedVar.prototype, "__bases__", {value: [AST_SymbolVar]});
        AST_ImportedVar.prototype.properties = {"alias":"AST_SymbolAlias the alias for this imported symbol"};

        function AST_SymbolNonlocal() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolNonlocal.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolNonlocal, AST_SymbolDeclaration);
        AST_SymbolNonlocal.prototype.__init__ = function __init__ () {
            AST_SymbolDeclaration.prototype.__init__ && AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolNonlocal.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolDeclaration.prototype.__repr__) return AST_SymbolDeclaration.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolNonlocal.prototype.__str__ = function __str__ () {
            if(AST_SymbolDeclaration.prototype.__str__) return AST_SymbolDeclaration.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolNonlocal.prototype, "__bases__", {value: [AST_SymbolDeclaration]});

        function AST_SymbolFunarg() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolFunarg.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolFunarg, AST_SymbolVar);
        AST_SymbolFunarg.prototype.__init__ = function __init__ () {
            AST_SymbolVar.prototype.__init__ && AST_SymbolVar.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolFunarg.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolVar.prototype.__repr__) return AST_SymbolVar.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolFunarg.prototype.__str__ = function __str__ () {
            if(AST_SymbolVar.prototype.__str__) return AST_SymbolVar.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolFunarg.prototype, "__bases__", {value: [AST_SymbolVar]});
        AST_SymbolFunarg.prototype.properties = {"annotation":"[AST_Node?] The annotation provided for this argument (if any)"};

        function AST_SymbolDefun() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolDefun.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolDefun, AST_SymbolDeclaration);
        AST_SymbolDefun.prototype.__init__ = function __init__ () {
            AST_SymbolDeclaration.prototype.__init__ && AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolDefun.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolDeclaration.prototype.__repr__) return AST_SymbolDeclaration.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolDefun.prototype.__str__ = function __str__ () {
            if(AST_SymbolDeclaration.prototype.__str__) return AST_SymbolDeclaration.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolDefun.prototype, "__bases__", {value: [AST_SymbolDeclaration]});

        function AST_SymbolLambda() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolLambda.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolLambda, AST_SymbolDeclaration);
        AST_SymbolLambda.prototype.__init__ = function __init__ () {
            AST_SymbolDeclaration.prototype.__init__ && AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolLambda.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolDeclaration.prototype.__repr__) return AST_SymbolDeclaration.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolLambda.prototype.__str__ = function __str__ () {
            if(AST_SymbolDeclaration.prototype.__str__) return AST_SymbolDeclaration.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolLambda.prototype, "__bases__", {value: [AST_SymbolDeclaration]});

        function AST_SymbolCatch() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolCatch.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolCatch, AST_SymbolDeclaration);
        AST_SymbolCatch.prototype.__init__ = function __init__ () {
            AST_SymbolDeclaration.prototype.__init__ && AST_SymbolDeclaration.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolCatch.prototype.__repr__ = function __repr__ () {
            if(AST_SymbolDeclaration.prototype.__repr__) return AST_SymbolDeclaration.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolCatch.prototype.__str__ = function __str__ () {
            if(AST_SymbolDeclaration.prototype.__str__) return AST_SymbolDeclaration.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolCatch.prototype, "__bases__", {value: [AST_SymbolDeclaration]});

        function AST_SymbolRef() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_SymbolRef.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_SymbolRef, AST_Symbol);
        AST_SymbolRef.prototype.__init__ = function __init__ () {
            AST_Symbol.prototype.__init__ && AST_Symbol.prototype.__init__.apply(this, arguments);
        };
        AST_SymbolRef.prototype.__repr__ = function __repr__ () {
            if(AST_Symbol.prototype.__repr__) return AST_Symbol.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_SymbolRef.prototype.__str__ = function __str__ () {
            if(AST_Symbol.prototype.__str__) return AST_Symbol.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_SymbolRef.prototype, "__bases__", {value: [AST_Symbol]});
        AST_SymbolRef.prototype.properties = {"parens":"[boolean/S] if true, this variable is wrapped in parentheses"};

        function AST_This() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_This.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_This, AST_Symbol);
        AST_This.prototype.__init__ = function __init__ () {
            AST_Symbol.prototype.__init__ && AST_Symbol.prototype.__init__.apply(this, arguments);
        };
        AST_This.prototype.__repr__ = function __repr__ () {
            if(AST_Symbol.prototype.__repr__) return AST_Symbol.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_This.prototype.__str__ = function __str__ () {
            if(AST_Symbol.prototype.__str__) return AST_Symbol.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_This.prototype, "__bases__", {value: [AST_Symbol]});

        function AST_Constant() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Constant.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Constant, AST_Node);
        AST_Constant.prototype.__init__ = function __init__ () {
            AST_Node.prototype.__init__ && AST_Node.prototype.__init__.apply(this, arguments);
        };
        AST_Constant.prototype.__repr__ = function __repr__ () {
            if(AST_Node.prototype.__repr__) return AST_Node.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Constant.prototype.__str__ = function __str__ () {
            if(AST_Node.prototype.__str__) return AST_Node.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Constant.prototype, "__bases__", {value: [AST_Node]});

        function AST_String() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_String.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_String, AST_Constant);
        AST_String.prototype.__init__ = function __init__ () {
            AST_Constant.prototype.__init__ && AST_Constant.prototype.__init__.apply(this, arguments);
        };
        AST_String.prototype.__repr__ = function __repr__ () {
            if(AST_Constant.prototype.__repr__) return AST_Constant.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_String.prototype.__str__ = function __str__ () {
            if(AST_Constant.prototype.__str__) return AST_Constant.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_String.prototype, "__bases__", {value: [AST_Constant]});
        AST_String.prototype.properties = {"value":"[string] the contents of this string"};

        function AST_Verbatim() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Verbatim.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Verbatim, AST_Constant);
        AST_Verbatim.prototype.__init__ = function __init__ () {
            AST_Constant.prototype.__init__ && AST_Constant.prototype.__init__.apply(this, arguments);
        };
        AST_Verbatim.prototype.__repr__ = function __repr__ () {
            if(AST_Constant.prototype.__repr__) return AST_Constant.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Verbatim.prototype.__str__ = function __str__ () {
            if(AST_Constant.prototype.__str__) return AST_Constant.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Verbatim.prototype, "__bases__", {value: [AST_Constant]});
        AST_Verbatim.prototype.properties = {"value":"[string] A string of raw JS code"};

        function AST_Number() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Number.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Number, AST_Constant);
        AST_Number.prototype.__init__ = function __init__ () {
            AST_Constant.prototype.__init__ && AST_Constant.prototype.__init__.apply(this, arguments);
        };
        AST_Number.prototype.__repr__ = function __repr__ () {
            if(AST_Constant.prototype.__repr__) return AST_Constant.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Number.prototype.__str__ = function __str__ () {
            if(AST_Constant.prototype.__str__) return AST_Constant.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Number.prototype, "__bases__", {value: [AST_Constant]});
        AST_Number.prototype.properties = {"value":"[number] the numeric value"};

        function AST_RegExp() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_RegExp.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_RegExp, AST_Constant);
        AST_RegExp.prototype.__init__ = function __init__ () {
            AST_Constant.prototype.__init__ && AST_Constant.prototype.__init__.apply(this, arguments);
        };
        AST_RegExp.prototype.__repr__ = function __repr__ () {
            if(AST_Constant.prototype.__repr__) return AST_Constant.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_RegExp.prototype.__str__ = function __str__ () {
            if(AST_Constant.prototype.__str__) return AST_Constant.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_RegExp.prototype, "__bases__", {value: [AST_Constant]});
        AST_RegExp.prototype.properties = {"value":"[RegExp] the actual regexp"};

        function AST_Atom() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Atom.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Atom, AST_Constant);
        AST_Atom.prototype.__init__ = function __init__(initializer) {
            var self = this;
            if (initializer) {
                self.start = initializer.start;
                self.end = initializer.end;
            }
        };
AST_Atom.prototype.__init__.__argnames__ = ["initializer"];
AST_Atom.prototype.__init__.__module__ = "ast_types";
undefined;
        AST_Atom.__argnames__ = AST_Atom.prototype.__init__.__argnames__;
        AST_Atom.__handles_kwarg_interpolation__ = AST_Atom.prototype.__init__.__handles_kwarg_interpolation__;
        AST_Atom.prototype.__repr__ = function __repr__ () {
            if(AST_Constant.prototype.__repr__) return AST_Constant.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Atom.prototype.__str__ = function __str__ () {
            if(AST_Constant.prototype.__str__) return AST_Constant.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Atom.prototype, "__bases__", {value: [AST_Constant]});

        function AST_Null() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Null.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Null, AST_Atom);
        AST_Null.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_Null.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Null.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Null.prototype, "__bases__", {value: [AST_Atom]});
        AST_Null.prototype.value = null;

        function AST_NaN() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_NaN.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_NaN, AST_Atom);
        AST_NaN.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_NaN.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_NaN.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_NaN.prototype, "__bases__", {value: [AST_Atom]});
        AST_NaN.prototype.value = NaN;

        function AST_Undefined() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Undefined.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Undefined, AST_Atom);
        AST_Undefined.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_Undefined.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Undefined.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Undefined.prototype, "__bases__", {value: [AST_Atom]});
        AST_Undefined.prototype.value = undefined;

        function AST_Hole() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Hole.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Hole, AST_Atom);
        AST_Hole.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_Hole.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Hole.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Hole.prototype, "__bases__", {value: [AST_Atom]});
        AST_Hole.prototype.value = undefined;

        function AST_Infinity() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Infinity.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Infinity, AST_Atom);
        AST_Infinity.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_Infinity.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Infinity.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Infinity.prototype, "__bases__", {value: [AST_Atom]});
        AST_Infinity.prototype.value = Infinity;

        function AST_Boolean() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_Boolean.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_Boolean, AST_Atom);
        AST_Boolean.prototype.__init__ = function __init__ () {
            AST_Atom.prototype.__init__ && AST_Atom.prototype.__init__.apply(this, arguments);
        };
        AST_Boolean.prototype.__repr__ = function __repr__ () {
            if(AST_Atom.prototype.__repr__) return AST_Atom.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_Boolean.prototype.__str__ = function __str__ () {
            if(AST_Atom.prototype.__str__) return AST_Atom.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_Boolean.prototype, "__bases__", {value: [AST_Atom]});

        function AST_False() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_False.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_False, AST_Boolean);
        AST_False.prototype.__init__ = function __init__ () {
            AST_Boolean.prototype.__init__ && AST_Boolean.prototype.__init__.apply(this, arguments);
        };
        AST_False.prototype.__repr__ = function __repr__ () {
            if(AST_Boolean.prototype.__repr__) return AST_Boolean.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_False.prototype.__str__ = function __str__ () {
            if(AST_Boolean.prototype.__str__) return AST_Boolean.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_False.prototype, "__bases__", {value: [AST_Boolean]});
        AST_False.prototype.value = false;

        function AST_True() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            AST_True.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(AST_True, AST_Boolean);
        AST_True.prototype.__init__ = function __init__ () {
            AST_Boolean.prototype.__init__ && AST_Boolean.prototype.__init__.apply(this, arguments);
        };
        AST_True.prototype.__repr__ = function __repr__ () {
            if(AST_Boolean.prototype.__repr__) return AST_Boolean.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        AST_True.prototype.__str__ = function __str__ () {
            if(AST_Boolean.prototype.__str__) return AST_Boolean.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(AST_True.prototype, "__bases__", {value: [AST_Boolean]});
        AST_True.prototype.value = true;

        function TreeWalker() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            TreeWalker.prototype.__init__.apply(this, arguments);
        }
        TreeWalker.prototype.__init__ = function __init__(callback) {
            var self = this;
            self.visit = callback;
            self.stack = ρσ_list_decorate([]);
        };
TreeWalker.prototype.__init__.__argnames__ = ["callback"];
TreeWalker.prototype.__init__.__module__ = "ast_types";
undefined;
        TreeWalker.__argnames__ = TreeWalker.prototype.__init__.__argnames__;
        TreeWalker.__handles_kwarg_interpolation__ = TreeWalker.prototype.__init__.__handles_kwarg_interpolation__;
        TreeWalker.prototype._visit = function _visit(node, descend) {
            var self = this;
            var ret;
            self.stack.push(node);
            ret = self.visit(node, (descend) ? (function() {
                var ρσ_anonfunc = function () {
                    return descend.call(node);                };
ρσ_anonfunc.__module__ = "ast_types";
undefined;
                return ρσ_anonfunc;
            })() : noop);
            if (!ret && descend) {
                descend.call(node);
            }
            self.stack.pop();
            return ret;
        };
TreeWalker.prototype._visit.__argnames__ = ["node", "descend"];
TreeWalker.prototype._visit.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.parent = function parent(n) {
            var self = this;
            return (ρσ_expr_temp = self.stack)[ρσ_bound_index(ρσ_operator_sub(ρσ_operator_sub(self.stack.length, 2), (n || 0)), ρσ_expr_temp)];
        };
TreeWalker.prototype.parent.__argnames__ = ["n"];
TreeWalker.prototype.parent.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.push = function push(node) {
            var self = this;
            self.stack.push(node);
        };
TreeWalker.prototype.push.__argnames__ = ["node"];
TreeWalker.prototype.push.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.pop = function pop() {
            var self = this;
            return self.stack.pop();
        };
TreeWalker.prototype.pop.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.self = function self() {
            var s = this;
            return (ρσ_expr_temp = s.stack)[ρσ_bound_index(ρσ_operator_sub(s.stack.length, 1), ρσ_expr_temp)];
        };
TreeWalker.prototype.self.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.find_parent = function find_parent(type) {
            var self = this;
            var stack, x, i;
            stack = self.stack;
            for (var ρσ_Index31 = ρσ_operator_sub(stack.length, 1); ρσ_Index31 > -1; ρσ_Index31-=1) {
                i = ρσ_Index31;
                x = stack[(typeof i === "number" && i < 0) ? stack.length + i : i];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, type)) {
                    return x;
                }
            }
        };
TreeWalker.prototype.find_parent.__argnames__ = ["type"];
TreeWalker.prototype.find_parent.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.in_boolean_context = function in_boolean_context() {
            var self = this;
            var stack, i, p;
            stack = self.stack;
            i = stack.length;
            i = ρσ_operator_isub(i, 1);
            self = stack[(typeof i === "number" && i < 0) ? stack.length + i : i];
            while (i > 0) {
                i = ρσ_operator_isub(i, 1);
                p = stack[(typeof i === "number" && i < 0) ? stack.length + i : i];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_If) && p.condition === self || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Conditional) && p.condition === self || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_DWLoop) && p.condition === self || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_UnaryPrefix) && p.operator === "!" && p.expression === self) {
                    return true;
                }
                if (!(((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary) && (p.operator === "&&" || p.operator === "||")))) {
                    return false;
                }
                self = p;
            }
        };
TreeWalker.prototype.in_boolean_context.__module__ = "ast_types";
undefined;
        TreeWalker.prototype.__repr__ = function __repr__ () {
                        return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        TreeWalker.prototype.__str__ = function __str__ () {
            return this.__repr__();
        };
        Object.defineProperty(TreeWalker.prototype, "__bases__", {value: []});

        function Found() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            Found.prototype.__init__.apply(this, arguments);
        }
        ρσ_extends(Found, Exception);
        Found.prototype.__init__ = function __init__ () {
            Exception.prototype.__init__ && Exception.prototype.__init__.apply(this, arguments);
        };
        Found.prototype.__repr__ = function __repr__ () {
            if(Exception.prototype.__repr__) return Exception.prototype.__repr__.call(this);
            return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        Found.prototype.__str__ = function __str__ () {
            if(Exception.prototype.__str__) return Exception.prototype.__str__.call(this);
return this.__repr__();
        };
        Object.defineProperty(Found.prototype, "__bases__", {value: [Exception]});
        

        function has_calls(expression) {
            if (!expression) {
                return false;
            }
            try {
                function is_call(node) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_BaseCall) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_ItemAccess)) {
                        throw new Found;
                    }
                };
is_call.__argnames__ = ["node"];
is_call.__module__ = "ast_types";
undefined;

                expression.walk(new TreeWalker(is_call));
            } catch (ρσ_Exception) {
                ρσ_last_exception = ρσ_Exception;
                if (ρσ_Exception instanceof Found) {
                    return true;
                } else {
                    throw ρσ_Exception;
                }
            }
            return false;
        };
has_calls.__argnames__ = ["expression"];
has_calls.__module__ = "ast_types";
undefined;

        ρσ_modules.ast_types.is_node_type = is_node_type;
        ρσ_modules.ast_types.AST = AST;
        ρσ_modules.ast_types.AST_Token = AST_Token;
        ρσ_modules.ast_types.AST_Node = AST_Node;
        ρσ_modules.ast_types.AST_Statement = AST_Statement;
        ρσ_modules.ast_types.AST_Debugger = AST_Debugger;
        ρσ_modules.ast_types.AST_Directive = AST_Directive;
        ρσ_modules.ast_types.AST_SimpleStatement = AST_SimpleStatement;
        ρσ_modules.ast_types.AST_Assert = AST_Assert;
        ρσ_modules.ast_types.walk_body = walk_body;
        ρσ_modules.ast_types.AST_Block = AST_Block;
        ρσ_modules.ast_types.AST_BlockStatement = AST_BlockStatement;
        ρσ_modules.ast_types.AST_EmptyStatement = AST_EmptyStatement;
        ρσ_modules.ast_types.AST_StatementWithBody = AST_StatementWithBody;
        ρσ_modules.ast_types.AST_DWLoop = AST_DWLoop;
        ρσ_modules.ast_types.AST_Do = AST_Do;
        ρσ_modules.ast_types.AST_While = AST_While;
        ρσ_modules.ast_types.AST_ForIn = AST_ForIn;
        ρσ_modules.ast_types.AST_ForJS = AST_ForJS;
        ρσ_modules.ast_types.AST_EllipsesRange = AST_EllipsesRange;
        ρσ_modules.ast_types.AST_ListComprehension = AST_ListComprehension;
        ρσ_modules.ast_types.AST_SetComprehension = AST_SetComprehension;
        ρσ_modules.ast_types.AST_DictComprehension = AST_DictComprehension;
        ρσ_modules.ast_types.AST_GeneratorComprehension = AST_GeneratorComprehension;
        ρσ_modules.ast_types.AST_With = AST_With;
        ρσ_modules.ast_types.AST_WithClause = AST_WithClause;
        ρσ_modules.ast_types.AST_Scope = AST_Scope;
        ρσ_modules.ast_types.AST_Toplevel = AST_Toplevel;
        ρσ_modules.ast_types.AST_Import = AST_Import;
        ρσ_modules.ast_types.AST_Imports = AST_Imports;
        ρσ_modules.ast_types.AST_Decorator = AST_Decorator;
        ρσ_modules.ast_types.AST_Lambda = AST_Lambda;
        ρσ_modules.ast_types.AST_Function = AST_Function;
        ρσ_modules.ast_types.AST_Class = AST_Class;
        ρσ_modules.ast_types.AST_Method = AST_Method;
        ρσ_modules.ast_types.AST_Jump = AST_Jump;
        ρσ_modules.ast_types.AST_Exit = AST_Exit;
        ρσ_modules.ast_types.AST_Return = AST_Return;
        ρσ_modules.ast_types.AST_Yield = AST_Yield;
        ρσ_modules.ast_types.AST_Throw = AST_Throw;
        ρσ_modules.ast_types.AST_LoopControl = AST_LoopControl;
        ρσ_modules.ast_types.AST_Break = AST_Break;
        ρσ_modules.ast_types.AST_Continue = AST_Continue;
        ρσ_modules.ast_types.AST_If = AST_If;
        ρσ_modules.ast_types.AST_Try = AST_Try;
        ρσ_modules.ast_types.AST_Catch = AST_Catch;
        ρσ_modules.ast_types.AST_Except = AST_Except;
        ρσ_modules.ast_types.AST_Finally = AST_Finally;
        ρσ_modules.ast_types.AST_Else = AST_Else;
        ρσ_modules.ast_types.AST_Definitions = AST_Definitions;
        ρσ_modules.ast_types.AST_Var = AST_Var;
        ρσ_modules.ast_types.AST_VarDef = AST_VarDef;
        ρσ_modules.ast_types.AST_BaseCall = AST_BaseCall;
        ρσ_modules.ast_types.AST_Call = AST_Call;
        ρσ_modules.ast_types.AST_ClassCall = AST_ClassCall;
        ρσ_modules.ast_types.AST_New = AST_New;
        ρσ_modules.ast_types.AST_Seq = AST_Seq;
        ρσ_modules.ast_types.AST_PropAccess = AST_PropAccess;
        ρσ_modules.ast_types.AST_Dot = AST_Dot;
        ρσ_modules.ast_types.AST_Sub = AST_Sub;
        ρσ_modules.ast_types.AST_ItemAccess = AST_ItemAccess;
        ρσ_modules.ast_types.AST_Splice = AST_Splice;
        ρσ_modules.ast_types.AST_Unary = AST_Unary;
        ρσ_modules.ast_types.AST_UnaryPrefix = AST_UnaryPrefix;
        ρσ_modules.ast_types.AST_Binary = AST_Binary;
        ρσ_modules.ast_types.AST_Existential = AST_Existential;
        ρσ_modules.ast_types.AST_Conditional = AST_Conditional;
        ρσ_modules.ast_types.AST_Assign = AST_Assign;
        ρσ_modules.ast_types.AST_Array = AST_Array;
        ρσ_modules.ast_types.AST_Object = AST_Object;
        ρσ_modules.ast_types.AST_ExpressiveObject = AST_ExpressiveObject;
        ρσ_modules.ast_types.AST_ObjectProperty = AST_ObjectProperty;
        ρσ_modules.ast_types.AST_ObjectKeyVal = AST_ObjectKeyVal;
        ρσ_modules.ast_types.AST_Set = AST_Set;
        ρσ_modules.ast_types.AST_SetItem = AST_SetItem;
        ρσ_modules.ast_types.AST_Symbol = AST_Symbol;
        ρσ_modules.ast_types.AST_SymbolAlias = AST_SymbolAlias;
        ρσ_modules.ast_types.AST_SymbolDeclaration = AST_SymbolDeclaration;
        ρσ_modules.ast_types.AST_SymbolVar = AST_SymbolVar;
        ρσ_modules.ast_types.AST_ImportedVar = AST_ImportedVar;
        ρσ_modules.ast_types.AST_SymbolNonlocal = AST_SymbolNonlocal;
        ρσ_modules.ast_types.AST_SymbolFunarg = AST_SymbolFunarg;
        ρσ_modules.ast_types.AST_SymbolDefun = AST_SymbolDefun;
        ρσ_modules.ast_types.AST_SymbolLambda = AST_SymbolLambda;
        ρσ_modules.ast_types.AST_SymbolCatch = AST_SymbolCatch;
        ρσ_modules.ast_types.AST_SymbolRef = AST_SymbolRef;
        ρσ_modules.ast_types.AST_This = AST_This;
        ρσ_modules.ast_types.AST_Constant = AST_Constant;
        ρσ_modules.ast_types.AST_String = AST_String;
        ρσ_modules.ast_types.AST_Verbatim = AST_Verbatim;
        ρσ_modules.ast_types.AST_Number = AST_Number;
        ρσ_modules.ast_types.AST_RegExp = AST_RegExp;
        ρσ_modules.ast_types.AST_Atom = AST_Atom;
        ρσ_modules.ast_types.AST_Null = AST_Null;
        ρσ_modules.ast_types.AST_NaN = AST_NaN;
        ρσ_modules.ast_types.AST_Undefined = AST_Undefined;
        ρσ_modules.ast_types.AST_Hole = AST_Hole;
        ρσ_modules.ast_types.AST_Infinity = AST_Infinity;
        ρσ_modules.ast_types.AST_Boolean = AST_Boolean;
        ρσ_modules.ast_types.AST_False = AST_False;
        ρσ_modules.ast_types.AST_True = AST_True;
        ρσ_modules.ast_types.TreeWalker = TreeWalker;
        ρσ_modules.ast_types.Found = Found;
        ρσ_modules.ast_types.has_calls = has_calls;
    })();

    (function(){
        var __name__ = "string_interpolation";
        function quoted_string(x) {
            return ρσ_operator_add(ρσ_operator_add("\"", x.replace(new RegExp("\\\\", "g"), "\\\\").replace(new RegExp("\"", "g"), "\\\"").replace(new RegExp("\n", "g"), "\\n")), "\"");
        };
quoted_string.__argnames__ = ["x"];
quoted_string.__module__ = "string_interpolation";
undefined;

        function render_markup(markup) {
            var ρσ_unpack, pos, key, ch, fmtspec, prefix;
            ρσ_unpack = [0, ""];
            pos = ρσ_unpack[0];
            key = ρσ_unpack[1];
            while (pos < markup.length) {
                ch = markup[(typeof pos === "number" && pos < 0) ? markup.length + pos : pos];
                if (ch === "!" || ch === ":") {
                    break;
                }
                key = ρσ_operator_iadd(key, ch);
                pos = ρσ_operator_iadd(pos, 1);
            }
            fmtspec = markup.slice(pos);
            prefix = "";
            if (key.endsWith("=")) {
                prefix = key;
                key = key.slice(0, -1);
            }
            return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("ρσ_str.format(\"", prefix), "{"), fmtspec), "}\", "), key), ")");
        };
render_markup.__argnames__ = ["markup"];
render_markup.__module__ = "string_interpolation";
undefined;

        function interpolate(template, raise_error) {
            var pos, in_brace, markup, ans, ch, i;
            pos = in_brace = 0;
            markup = "";
            ans = ρσ_list_decorate([ "" ]);
            while (pos < template.length) {
                ch = template[(typeof pos === "number" && pos < 0) ? template.length + pos : pos];
                if (in_brace) {
                    if (ch === "{") {
                        in_brace = ρσ_operator_iadd(in_brace, 1);
                        markup = ρσ_operator_iadd(markup, "{");
                    } else if (ch === "}") {
                        in_brace = ρσ_operator_isub(in_brace, 1);
                        if (in_brace > 0) {
                            markup = ρσ_operator_iadd(markup, "}");
                        } else {
                            ans.push([markup]);
                            ans.push("");
                        }
                    } else {
                        markup = ρσ_operator_iadd(markup, ch);
                    }
                } else {
                    if (ch === "{") {
                        if (template[ρσ_bound_index(ρσ_operator_add(pos, 1), template)] === "{") {
                            pos = ρσ_operator_iadd(pos, 1);
                            ans[ans.length-1] = ρσ_operator_iadd(ans[ans.length-1], "{");
                        } else {
                            in_brace = 1;
                            markup = "";
                        }
                    } else if (ch === "}") {
                        if (template[ρσ_bound_index(ρσ_operator_add(pos, 1), template)] === "}") {
                            pos = ρσ_operator_iadd(pos, 1);
                            ans[ans.length-1] = ρσ_operator_iadd(ans[ans.length-1], "}");
                        } else {
                            (raise_error?.__call__?.bind(raise_error) ?? raise_error)("f-string: single '}' is not allowed");
                        }
                    } else {
                        ans[ans.length-1] = ρσ_operator_iadd(ans[ans.length-1], ch);
                    }
                }
                pos = ρσ_operator_iadd(pos, 1);
            }
            if (in_brace) {
                (raise_error?.__call__?.bind(raise_error) ?? raise_error)("expected '}' before end of string");
            }
            if (ans[ans.length-1] === "+") {
                ans[ans.length-1] = "";
            }
            var ρσ_Iter32 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(ans));
            ρσ_Iter32 = ((typeof ρσ_Iter32[Symbol.iterator] === "function") ? (ρσ_Iter32 instanceof Map ? ρσ_Iter32.keys() : ρσ_Iter32) : Object.keys(ρσ_Iter32));
            for (var ρσ_Index32 of ρσ_Iter32) {
                i = ρσ_Index32;
                if (typeof ans[(typeof i === "number" && i < 0) ? ans.length + i : i] === "string") {
                    ans[(typeof i === "number" && i < 0) ? ans.length + i : i] = (quoted_string?.__call__?.bind(quoted_string) ?? quoted_string)(ans[(typeof i === "number" && i < 0) ? ans.length + i : i]);
                } else {
                    ans[(typeof i === "number" && i < 0) ? ans.length + i : i] = ρσ_operator_add(ρσ_operator_add("+", render_markup.apply(this, ans[(typeof i === "number" && i < 0) ? ans.length + i : i])), "+");
                }
            }
            return ans.join("");
        };
interpolate.__argnames__ = ["template", "raise_error"];
interpolate.__module__ = "string_interpolation";
undefined;

        ρσ_modules.string_interpolation.quoted_string = quoted_string;
        ρσ_modules.string_interpolation.render_markup = render_markup;
        ρσ_modules.string_interpolation.interpolate = interpolate;
    })();

    (function(){
        var __name__ = "tokenizer";
        var RE_HEX_NUMBER, RE_OCT_NUMBER, RE_DEC_NUMBER, OPERATOR_CHARS, ASCII_CONTROL_CHARS, HEX_PAT, NAME_PAT, OPERATORS, OP_MAP, WHITESPACE_CHARS, PUNC_BEFORE_EXPRESSION, PUNC_CHARS, keywords, keywords_atom, reserved_words, keyword_before_expression, ALL_KEYWORDS, KEYWORDS, RESERVED_WORDS, KEYWORDS_BEFORE_EXPRESSION, KEYWORDS_ATOM, IDENTIFIER_PAT, UNICODE;
        var ALIAS_MAP = ρσ_modules.unicode_aliases.ALIAS_MAP;

        var make_predicate = ρσ_modules.utils.make_predicate;
        var characters = ρσ_modules.utils.characters;
        var charAt = ρσ_modules.utils.charAt;
        var startswith = ρσ_modules.utils.startswith;

        var AST_Token = ρσ_modules.ast_types.AST_Token;

        var EOFError = ρσ_modules.errors.EOFError;
        var SyntaxError = ρσ_modules.errors.SyntaxError;

        var interpolate = ρσ_modules.string_interpolation.interpolate;

        RE_HEX_NUMBER = new RegExp("^0x[0-9a-f]+$", "i");
        RE_OCT_NUMBER = new RegExp("^0[0-7]+$");
        RE_DEC_NUMBER = new RegExp("^\\d*\\.?\\d*(?:e[+-]?\\d*(?:\\d\\.?|\\.?\\d)\\d*)?$", "i");
        OPERATOR_CHARS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)((characters?.__call__?.bind(characters) ?? characters)("+-*&%=<>!?|~^@"));
        ASCII_CONTROL_CHARS = {"a":7,"b":8,"f":12,"n":10,"r":13,"t":9,"v":11};
        HEX_PAT = new RegExp("[a-fA-F0-9]");
        NAME_PAT = new RegExp("[a-zA-Z ]");
        OPERATORS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)(ρσ_list_decorate([ "in", "instanceof", "typeof", "new", "void", "del", "+", "-", "not", "~", "&", "|", "^^", "^", "**", "*", "//", "/", "%", ">>", "<<", ">>>", "<", ">", "<=", ">=", "==", "is", "!=", "=", "+=", "-=", "//=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&=", "and", "or", "@", "->" ]));
        OP_MAP = {"or":"||","and":"&&","not":"!","del":"delete","None":"null","is":"==="};
        WHITESPACE_CHARS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)((characters?.__call__?.bind(characters) ?? characters)("  \n\r\t\f\u000b​᠎           \u202f 　"));
        PUNC_BEFORE_EXPRESSION = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)((characters?.__call__?.bind(characters) ?? characters)("[{(,.;:"));
        PUNC_CHARS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)((characters?.__call__?.bind(characters) ?? characters)("[]{}(),;:?"));
        keywords = "as assert break class continue def del do elif else except finally for from global if import in is lambda new nonlocal pass raise return yield try while with or and not";
        keywords_atom = "False None True";
        reserved_words = "break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof new return super switch this throw try typeof var void while with yield enum implements static private package let public protected interface await null true false";
        keyword_before_expression = "return yield new del raise elif else if";
        ALL_KEYWORDS = ρσ_operator_add(ρσ_operator_add(keywords, " "), keywords_atom);
        KEYWORDS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)(keywords);
        RESERVED_WORDS = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)(reserved_words);
        KEYWORDS_BEFORE_EXPRESSION = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)(keyword_before_expression);
        KEYWORDS_ATOM = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)(keywords_atom);
        IDENTIFIER_PAT = new RegExp("^[a-z_$][_a-z0-9$]*$", "i");
        function is_string_modifier(val) {
            var ch;
            var ρσ_Iter33 = val;
            ρσ_Iter33 = ((typeof ρσ_Iter33[Symbol.iterator] === "function") ? (ρσ_Iter33 instanceof Map ? ρσ_Iter33.keys() : ρσ_Iter33) : Object.keys(ρσ_Iter33));
            for (var ρσ_Index33 of ρσ_Iter33) {
                ch = ρσ_Index33;
                if (!ρσ_in(ch, "vrufVRUF")) {
                    return false;
                }
            }
            return true;
        };
is_string_modifier.__argnames__ = ["val"];
is_string_modifier.__module__ = "tokenizer";
undefined;

        function is_letter(code) {
            return code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 170 && UNICODE["letter"].test((chr?.__call__?.bind(chr) ?? chr)(code));
        };
is_letter.__argnames__ = ["code"];
is_letter.__module__ = "tokenizer";
undefined;

        function is_digit(code) {
            return code >= 48 && code <= 57;
        };
is_digit.__argnames__ = ["code"];
is_digit.__module__ = "tokenizer";
undefined;

        function is_dot(code) {
            return ρσ_equals(code, 46);
        };
is_dot.__argnames__ = ["code"];
is_dot.__module__ = "tokenizer";
undefined;

        function is_alphanumeric_char(code) {
            return (is_digit?.__call__?.bind(is_digit) ?? is_digit)(code) || (is_letter?.__call__?.bind(is_letter) ?? is_letter)(code);
        };
is_alphanumeric_char.__argnames__ = ["code"];
is_alphanumeric_char.__module__ = "tokenizer";
undefined;

        function is_unicode_combining_mark(ch) {
            return UNICODE["non_spacing_mark"].test(ch) || UNICODE["space_combining_mark"].test(ch);
        };
is_unicode_combining_mark.__argnames__ = ["ch"];
is_unicode_combining_mark.__module__ = "tokenizer";
undefined;

        function is_unicode_connector_punctuation(ch) {
            return UNICODE["connector_punctuation"].test(ch);
        };
is_unicode_connector_punctuation.__argnames__ = ["ch"];
is_unicode_connector_punctuation.__module__ = "tokenizer";
undefined;

        function is_identifier(name) {
            return !RESERVED_WORDS[(typeof name === "number" && name < 0) ? RESERVED_WORDS.length + name : name] && !KEYWORDS[(typeof name === "number" && name < 0) ? KEYWORDS.length + name : name] && !KEYWORDS_ATOM[(typeof name === "number" && name < 0) ? KEYWORDS_ATOM.length + name : name] && IDENTIFIER_PAT.test(name);
        };
is_identifier.__argnames__ = ["name"];
is_identifier.__module__ = "tokenizer";
undefined;

        function is_identifier_start(code) {
            return code === 36 || code === 95 || (is_letter?.__call__?.bind(is_letter) ?? is_letter)(code);
        };
is_identifier_start.__argnames__ = ["code"];
is_identifier_start.__module__ = "tokenizer";
undefined;

        function is_identifier_char(ch) {
            var code;
            code = (ord?.__call__?.bind(ord) ?? ord)(ch);
            return (is_identifier_start?.__call__?.bind(is_identifier_start) ?? is_identifier_start)(code) || (is_digit?.__call__?.bind(is_digit) ?? is_digit)(code) || code === 8204 || code === 8205 || (is_unicode_combining_mark?.__call__?.bind(is_unicode_combining_mark) ?? is_unicode_combining_mark)(ch) || (is_unicode_connector_punctuation?.__call__?.bind(is_unicode_connector_punctuation) ?? is_unicode_connector_punctuation)(ch);
        };
is_identifier_char.__argnames__ = ["ch"];
is_identifier_char.__module__ = "tokenizer";
undefined;

        function parse_js_number(num) {
            if (RE_HEX_NUMBER.test(num)) {
                return (int?.__call__?.bind(int) ?? int)(num.slice(2), 16);
            } else if (RE_OCT_NUMBER.test(num)) {
                return (int?.__call__?.bind(int) ?? int)(num.slice(1), 8);
            } else if (RE_DEC_NUMBER.test(num)) {
                return (float?.__call__?.bind(float) ?? float)(num);
            }
            throw new ValueError("invalid number");
        };
parse_js_number.__argnames__ = ["num"];
parse_js_number.__module__ = "tokenizer";
undefined;

        UNICODE = {"letter":new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0523\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u097B-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1159\\u115F-\\u11A2\\u11A8-\\u11F9\\u1200-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u1676\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19A9\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2C6F\\u2C71-\\u2C7D\\u2C80-\\u2CE4\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400\\u4DB5\\u4E00\\u9FC3\\uA000-\\uA48C\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA90A-\\uA925\\uA930-\\uA946\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAC00\\uD7A3\\uF900-\\uFA2D\\uFA30-\\uFA6A\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),"non_spacing_mark":new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),"space_combining_mark":new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),"connector_punctuation":new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")};
        function is_token(token, type, val) {
            return token.type === type && (val === null || val === undefined || token.value === val);
        };
is_token.__argnames__ = ["token", "type", "val"];
is_token.__module__ = "tokenizer";
undefined;

        function tokenizer(raw_text, filename) {
            var S, read_string, read_regexp;
            S = {"exponent":false,"text":raw_text.replace(new RegExp("\\r\\n?|[\\n\\u2028\\u2029]", "g"), "\n").replace(new RegExp("\\uFEFF", "g"), ""),"filename":filename,"pos":0,"tokpos":0,"line":1,"tokline":0,"col":0,"tokcol":0,"newline_before":false,"regex_allowed":false,"comments_before":ρσ_list_decorate([]),"whitespace_before":ρσ_list_decorate([]),"newblock":false,"endblock":false,"indentation_matters":[ true ],"cached_whitespace":"","prev":undefined,"index_or_slice":[ false ],"expecting_object_literal_key":false};
            function peek() {
                return (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], S["pos"]);
            };
peek.__module__ = "tokenizer";
undefined;

            function peekpeek() {
                return (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], ρσ_operator_add(S["pos"], 1));
            };
peekpeek.__module__ = "tokenizer";
undefined;

            function prevChar() {
                return (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], ρσ_operator_sub(S["tokpos"], 1));
            };
prevChar.__module__ = "tokenizer";
undefined;

            function next() {
                var signal_eof = (arguments[0] === undefined || ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? next.__defaults__.signal_eof : arguments[0];
                var in_string = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? next.__defaults__.in_string : arguments[1];
                var ρσ_kwargs_obj = arguments[arguments.length-1];
                if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "signal_eof")){
                    signal_eof = ρσ_kwargs_obj.signal_eof;
                }
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "in_string")){
                    in_string = ρσ_kwargs_obj.in_string;
                }
                var ch;
                ch = (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], S["pos"]);
                S["pos"] = ρσ_operator_iadd(S["pos"], 1);
                if (signal_eof && !ch) {
                    throw EOFError;
                }
                if (ch === "\n") {
                    S["newline_before"] = S["newline_before"] || !in_string;
                    S["line"] = ρσ_operator_iadd(S["line"], 1);
                    S["col"] = 0;
                } else {
                    S["col"] = ρσ_operator_iadd(S["col"], 1);
                }
                return ch;
            };
next.__defaults__ = {signal_eof:false, in_string:false};
next.__handles_kwarg_interpolation__ = true;
next.__argnames__ = ["signal_eof", "in_string"];
next.__module__ = "tokenizer";
undefined;

            function find() {
                var what = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
                var signal_eof = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? find.__defaults__.signal_eof : arguments[1];
                var ρσ_kwargs_obj = arguments[arguments.length-1];
                if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "signal_eof")){
                    signal_eof = ρσ_kwargs_obj.signal_eof;
                }
                var pos;
                pos = S["text"].indexOf(what, S["pos"]);
                if (signal_eof && pos === -1) {
                    throw EOFError;
                }
                return pos;
            };
find.__defaults__ = {signal_eof:false};
find.__handles_kwarg_interpolation__ = true;
find.__argnames__ = ["what", "signal_eof"];
find.__module__ = "tokenizer";
undefined;

            function start_token() {
                S["tokline"] = S["line"];
                S["tokcol"] = S["col"];
                S["tokpos"] = S["pos"];
            };
start_token.__module__ = "tokenizer";
undefined;

            function token() {
                var type = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
                var value = ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[1];
                var is_comment = (arguments[2] === undefined || ( 2 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? token.__defaults__.is_comment : arguments[2];
                var keep_newline = (arguments[3] === undefined || ( 3 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? token.__defaults__.keep_newline : arguments[3];
                var ρσ_kwargs_obj = arguments[arguments.length-1];
                if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "is_comment")){
                    is_comment = ρσ_kwargs_obj.is_comment;
                }
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "keep_newline")){
                    keep_newline = ρσ_kwargs_obj.keep_newline;
                }
                var ret, i;
                if (S["exponent"] && ρσ_equals(type, "operator")) {
                    if (ρσ_equals(value, "^")) {
                        value = "**";
                    } else if (ρσ_equals(value, "^^")) {
                        value = "^";
                    }
                }
                S["regex_allowed"] = type === "operator" || type === "keyword" && KEYWORDS_BEFORE_EXPRESSION[(typeof value === "number" && value < 0) ? KEYWORDS_BEFORE_EXPRESSION.length + value : value] || type === "punc" && PUNC_BEFORE_EXPRESSION[(typeof value === "number" && value < 0) ? PUNC_BEFORE_EXPRESSION.length + value : value];
                if (type === "operator" && value === "is" && S["text"].substr(S["pos"]).trimLeft().substr(0, 4).trimRight() === "not") {
                    (next_token?.__call__?.bind(next_token) ?? next_token)();
                    value = "!==";
                }
                if (type === "operator" && OP_MAP[(typeof value === "number" && value < 0) ? OP_MAP.length + value : value]) {
                    value = OP_MAP[(typeof value === "number" && value < 0) ? OP_MAP.length + value : value];
                }
                ret = {"type":type,"value":value,"line":S["tokline"],"col":S["tokcol"],"pos":S["tokpos"],"endpos":S["pos"],"nlb":S["newline_before"],"file":filename,"leading_whitespace":(ρσ_expr_temp = S["whitespace_before"])[ρσ_expr_temp.length-1] || ""};
                if (!is_comment) {
                    ret["comments_before"] = S["comments_before"];
                    S["comments_before"] = ρσ_list_decorate([]);
                    for (var ρσ_Index34 = 0; ρσ_Index34 < ret["comments_before.length"]; ρσ_Index34++) {
                        i = ρσ_Index34;
                        ret["nlb"] = ret["nlb"] || (ρσ_expr_temp = ret["comments_before"])[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i]["nlb"];
                    }
                }
                if (!keep_newline) {
                    S["newline_before"] = false;
                }
                if (type === "punc") {
                    if (value === ":" && !(ρσ_expr_temp = S["index_or_slice"])[ρσ_expr_temp.length-1] && !S["expecting_object_literal_key"] && (!S["text"].substring(ρσ_operator_add(S["pos"], 1), (find?.__call__?.bind(find) ?? find)("\n")).trim() || !S["text"].substring(ρσ_operator_add(S["pos"], 1), (find?.__call__?.bind(find) ?? find)("#")).trim())) {
                        S["newblock"] = true;
                        S["indentation_matters"].push(true);
                    }
                    if (value === "[") {
                        if (S["prev"] && (S["prev"].type === "name" || S["prev"].type === "punc" && ρσ_in(S["prev"].value, ")]"))) {
                            S["index_or_slice"].push(true);
                        } else {
                            S["index_or_slice"].push(false);
                        }
                        S["indentation_matters"].push(false);
                    } else if (value === "{" || value === "(") {
                        S["indentation_matters"].push(false);
                    } else if (value === "]") {
                        S["index_or_slice"].pop();
                        S["indentation_matters"].pop();
                    } else if (value === "}" || value === ")") {
                        S["indentation_matters"].pop();
                    }
                }
                S["prev"] = new AST_Token(ret);
                return S["prev"];
            };
token.__defaults__ = {is_comment:false, keep_newline:false};
token.__handles_kwarg_interpolation__ = true;
token.__argnames__ = ["type", "value", "is_comment", "keep_newline"];
token.__module__ = "tokenizer";
undefined;

            function parse_whitespace() {
                var leading_whitespace, whitespace_exists, ch;
                leading_whitespace = "";
                whitespace_exists = false;
                while (WHITESPACE_CHARS[ρσ_bound_index((peek?.__call__?.bind(peek) ?? peek)(), WHITESPACE_CHARS)]) {
                    whitespace_exists = true;
                    ch = (next?.__call__?.bind(next) ?? next)();
                    if (ch === "\n") {
                        leading_whitespace = "";
                    } else {
                        leading_whitespace = ρσ_operator_iadd(leading_whitespace, ch);
                    }
                }
                if ((peek?.__call__?.bind(peek) ?? peek)() !== "#") {
                    if (!whitespace_exists) {
                        leading_whitespace = S["cached_whitespace"];
                    } else {
                        S["cached_whitespace"] = leading_whitespace;
                    }
                    if (S["newline_before"] || S["endblock"]) {
                        return (test_indent_token?.__call__?.bind(test_indent_token) ?? test_indent_token)(leading_whitespace);
                    }
                }
                return 0;
            };
parse_whitespace.__module__ = "tokenizer";
undefined;

            function test_indent_token(leading_whitespace) {
                var most_recent;
                most_recent = (ρσ_expr_temp = S["whitespace_before"])[ρσ_expr_temp.length-1] || "";
                S["endblock"] = false;
                if ((ρσ_expr_temp = S["indentation_matters"])[ρσ_expr_temp.length-1] && leading_whitespace !== most_recent) {
                    if (S["newblock"] && leading_whitespace && (startswith?.__call__?.bind(startswith) ?? startswith)(leading_whitespace, most_recent)) {
                        S["newblock"] = false;
                        S["whitespace_before"].push(leading_whitespace);
                        return 1;
                    } else if (most_recent && (startswith?.__call__?.bind(startswith) ?? startswith)(most_recent, leading_whitespace)) {
                        S["endblock"] = true;
                        S["whitespace_before"].pop();
                        return -1;
                    } else {
                        (parse_error?.__call__?.bind(parse_error) ?? parse_error)("Inconsistent indentation");
                    }
                }
                return 0;
            };
test_indent_token.__argnames__ = ["leading_whitespace"];
test_indent_token.__module__ = "tokenizer";
undefined;

            function read_while(pred) {
                var ret, i, ch;
                ret = "";
                i = 0;
                ch = (peek?.__call__?.bind(peek) ?? peek)();
                while (ch && (pred?.__call__?.bind(pred) ?? pred)(ch, i)) {
                    i = ρσ_operator_iadd(i, 1);
                    ret = ρσ_operator_iadd(ret, (next?.__call__?.bind(next) ?? next)());
                    ch = (peek?.__call__?.bind(peek) ?? peek)();
                }
                return ret;
            };
read_while.__argnames__ = ["pred"];
read_while.__module__ = "tokenizer";
undefined;

            function parse_error() {
                var err = ( 0 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true) ? undefined : arguments[0];
                var is_eof = (arguments[1] === undefined || ( 1 === arguments.length-1 && arguments[arguments.length-1] !== null && typeof arguments[arguments.length-1] === "object" && arguments[arguments.length-1] [ρσ_kwargs_symbol] === true)) ? parse_error.__defaults__.is_eof : arguments[1];
                var ρσ_kwargs_obj = arguments[arguments.length-1];
                if (ρσ_kwargs_obj === null || typeof ρσ_kwargs_obj !== "object" || ρσ_kwargs_obj [ρσ_kwargs_symbol] !== true) ρσ_kwargs_obj = {};
                if (Object.prototype.hasOwnProperty.call(ρσ_kwargs_obj, "is_eof")){
                    is_eof = ρσ_kwargs_obj.is_eof;
                }
                throw new SyntaxError(err, filename, S["tokline"], S["tokcol"], S["tokpos"], is_eof);
            };
parse_error.__defaults__ = {is_eof:false};
parse_error.__handles_kwarg_interpolation__ = true;
parse_error.__argnames__ = ["err", "is_eof"];
parse_error.__module__ = "tokenizer";
undefined;

            function read_num(prefix) {
                var has_e, has_x, has_dot, num, valid, seen;
                has_e = false;
                has_x = false;
                has_dot = prefix === ".";
                if (!prefix && (peek?.__call__?.bind(peek) ?? peek)() === "0" && (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], ρσ_operator_add(S["pos"], 1)) === "b") {
                    [(next?.__call__?.bind(next) ?? next)(), (next?.__call__?.bind(next) ?? next)()];
                    function is01(ch) {
                        return ch === "0" || ch === "1";
                    };
is01.__argnames__ = ["ch"];
is01.__module__ = "tokenizer";
undefined;

                    num = (read_while?.__call__?.bind(read_while) ?? read_while)(is01);
                    try {
                        valid = (int?.__call__?.bind(int) ?? int)(num, 2);
                    } catch (ρσ_Exception) {
                        ρσ_last_exception = ρσ_Exception;
                        {
                            (parse_error?.__call__?.bind(parse_error) ?? parse_error)("Invalid syntax for a binary number");
                        } 
                    }
                    return (token?.__call__?.bind(token) ?? token)("num", valid);
                }
                seen = ρσ_list_decorate([]);
                function is_num(ch, i) {
                    seen.push(ch);
                    if (ch === "x" || ch === "X") {
                        if (has_x || seen.length !== 2 || seen[0] !== "0") {
                            return false;
                        }
                        has_x = true;
                        return true;
                    } else if (ch === "e" || ch === "E") {
                        if (has_x) {
                            return true;
                        }
                        if (has_e || ρσ_equals(i, 0)) {
                            return false;
                        }
                        has_e = true;
                        return true;
                    } else if (ch === "-") {
                        if (i === 0 && !prefix) {
                            return true;
                        }
                        if (has_e && seen[ρσ_bound_index(ρσ_operator_sub(i, 1), seen)].toLowerCase() === "e") {
                            return true;
                        }
                        return false;
                    } else if (ch === "+") {
                        if (has_e && seen[ρσ_bound_index(ρσ_operator_sub(i, 1), seen)].toLowerCase() === "e") {
                            return true;
                        }
                        return false;
                    } else if (ch === ".") {
                        if ((peekpeek?.__call__?.bind(peekpeek) ?? peekpeek)() === ".") {
                            return false;
                        }
                        if (!has_dot && !has_x && !has_e) {
                            has_dot = true;
                            return true;
                        }
                        return false;
                    }
                    return (is_alphanumeric_char?.__call__?.bind(is_alphanumeric_char) ?? is_alphanumeric_char)(ch.charCodeAt(0));
                };
is_num.__argnames__ = ["ch", "i"];
is_num.__module__ = "tokenizer";
undefined;

                num = (read_while?.__call__?.bind(read_while) ?? read_while)(is_num);
                if (prefix) {
                    num = ρσ_operator_add(prefix, num);
                }
                try {
                    valid = (parse_js_number?.__call__?.bind(parse_js_number) ?? parse_js_number)(num);
                } catch (ρσ_Exception) {
                    ρσ_last_exception = ρσ_Exception;
                    {
                        (parse_error?.__call__?.bind(parse_error) ?? parse_error)(ρσ_operator_add("SyntaxError: invalid syntax in numeric literal -- ", num));
                        return undefined;
                    } 
                }
                return (token?.__call__?.bind(token) ?? token)("num", valid);
            };
read_num.__argnames__ = ["prefix"];
read_num.__module__ = "tokenizer";
undefined;

            function read_hex_digits(count) {
                var ans, nval;
                ans = "";
                while (count > 0) {
                    count = ρσ_operator_isub(count, 1);
                    if (!HEX_PAT.test((peek?.__call__?.bind(peek) ?? peek)())) {
                        return ans;
                    }
                    ans = ρσ_operator_iadd(ans, (next?.__call__?.bind(next) ?? next)());
                }
                nval = (int?.__call__?.bind(int) ?? int)(ans, 16);
                if (nval > 1114111) {
                    return ans;
                }
                return nval;
            };
read_hex_digits.__argnames__ = ["count"];
read_hex_digits.__module__ = "tokenizer";
undefined;

            function read_escape_sequence() {
                var q, octal, code, name, key;
                q = (next?.__call__?.bind(next) ?? next)(true);
                if (q === "\n") {
                    return "";
                }
                if (q === "\\") {
                    return q;
                }
                if ("\"'".indexOf(q) !== -1) {
                    return q;
                }
                if (ASCII_CONTROL_CHARS[(typeof q === "number" && q < 0) ? ASCII_CONTROL_CHARS.length + q : q]) {
                    return String.fromCharCode(ASCII_CONTROL_CHARS[(typeof q === "number" && q < 0) ? ASCII_CONTROL_CHARS.length + q : q]);
                }
                if ("0" <= q && q <= "7") {
                    octal = q;
                    if ("0" <= (ρσ_cond_temp = (peek?.__call__?.bind(peek) ?? peek)()) && ρσ_cond_temp <= "7") {
                        octal = ρσ_operator_iadd(octal, (next?.__call__?.bind(next) ?? next)());
                    }
                    if ("0" <= (ρσ_cond_temp = (peek?.__call__?.bind(peek) ?? peek)()) && ρσ_cond_temp <= "7") {
                        octal = ρσ_operator_iadd(octal, (next?.__call__?.bind(next) ?? next)());
                    }
                    code = (parseInt?.__call__?.bind(parseInt) ?? parseInt)(octal, 8);
                    if ((isNaN?.__call__?.bind(isNaN) ?? isNaN)(code)) {
                        return ρσ_operator_add("\\", octal);
                    }
                    return String.fromCharCode(code);
                }
                if (q === "x") {
                    code = (read_hex_digits?.__call__?.bind(read_hex_digits) ?? read_hex_digits)(2);
                    if (typeof code === "number") {
                        return String.fromCharCode(code);
                    }
                    return ρσ_operator_add("\\x", code);
                }
                if (q === "u") {
                    code = (read_hex_digits?.__call__?.bind(read_hex_digits) ?? read_hex_digits)(4);
                    if (typeof code === "number") {
                        return String.fromCharCode(code);
                    }
                    return ρσ_operator_add("\\u", code);
                }
                if (q === "U") {
                    code = (read_hex_digits?.__call__?.bind(read_hex_digits) ?? read_hex_digits)(8);
                    if (typeof code === "number") {
                        if (code <= 65535) {
                            return String.fromCharCode(code);
                        }
                        code = ρσ_operator_isub(code, 65536);
                        return String.fromCharCode(ρσ_operator_add(55296, (code >> 10)), ρσ_operator_add(56320, (code & 1023)));
                    }
                    return ρσ_operator_add("\\U", code);
                }
                if (q === "N" && (peek?.__call__?.bind(peek) ?? peek)() === "{") {
                    (next?.__call__?.bind(next) ?? next)();
                    function is_name_ch(ch) {
                        return NAME_PAT.test(ch);
                    };
is_name_ch.__argnames__ = ["ch"];
is_name_ch.__module__ = "tokenizer";
undefined;

                    name = (read_while?.__call__?.bind(read_while) ?? read_while)(is_name_ch);
                    if ((peek?.__call__?.bind(peek) ?? peek)() !== "}") {
                        return ρσ_operator_add("\\N{", name);
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    key = (name || "").toLowerCase();
                    if (!name || !Object.prototype.hasOwnProperty.call(ALIAS_MAP, key)) {
                        return ρσ_operator_add(ρσ_operator_add("\\N{", name), "}");
                    }
                    code = ALIAS_MAP[(typeof key === "number" && key < 0) ? ALIAS_MAP.length + key : key];
                    if (code <= 65535) {
                        return String.fromCharCode(code);
                    }
                    code = ρσ_operator_isub(code, 65536);
                    return String.fromCharCode(ρσ_operator_add(55296, (code >> 10)), ρσ_operator_add(56320, (code & 1023)));
                }
                return ρσ_operator_add("\\", q);
            };
read_escape_sequence.__module__ = "tokenizer";
undefined;

            function with_eof_error(eof_error, cont) {
                function eof_error() {
                    try {
                        return cont.apply(null, arguments);
                    } catch (ρσ_Exception) {
                        ρσ_last_exception = ρσ_Exception;
                        if (ρσ_Exception instanceof Error) {
                            var ex = ρσ_Exception;
                            if (ex === EOFError) {
                                (parse_error?.__call__?.bind(parse_error) ?? parse_error)(eof_error, true);
                            } else {
                                throw ρσ_Exception;
                            }
                        } else {
                            throw ρσ_Exception;
                        }
                    }
                };
eof_error.__module__ = "tokenizer";
undefined;

                return eof_error;
            };
with_eof_error.__argnames__ = ["eof_error", "cont"];
with_eof_error.__module__ = "tokenizer";
undefined;

            function _read_string(is_raw_literal, is_js_literal) {
                var quote, tok_type, ret, is_multiline, ch;
                quote = (next?.__call__?.bind(next) ?? next)();
                tok_type = (is_js_literal) ? "js" : "string";
                ret = "";
                is_multiline = false;
                if ((peek?.__call__?.bind(peek) ?? peek)() === quote) {
                    (next?.__call__?.bind(next) ?? next)(true);
                    if ((peek?.__call__?.bind(peek) ?? peek)() === quote) {
                        (next?.__call__?.bind(next) ?? next)(true);
                        is_multiline = true;
                    } else {
                        return (token?.__call__?.bind(token) ?? token)(tok_type, "");
                    }
                }
                while (true) {
                    ch = (next?.__call__?.bind(next) ?? next)(true, true);
                    if (!ch) {
                        break;
                    }
                    if (ch === "\n" && !is_multiline) {
                        (parse_error?.__call__?.bind(parse_error) ?? parse_error)("End of line while scanning string literal");
                    }
                    if (ch === "\\") {
                        ret = ρσ_operator_iadd(ret, (is_raw_literal) ? ρσ_operator_add("\\", (next?.__call__?.bind(next) ?? next)(true)) : (read_escape_sequence?.__call__?.bind(read_escape_sequence) ?? read_escape_sequence)());
                        continue;
                    }
                    if (ch === quote) {
                        if (!is_multiline) {
                            break;
                        }
                        if ((peek?.__call__?.bind(peek) ?? peek)() === quote) {
                            (next?.__call__?.bind(next) ?? next)();
                            if ((peek?.__call__?.bind(peek) ?? peek)() === quote) {
                                (next?.__call__?.bind(next) ?? next)();
                                break;
                            } else {
                                ch = ρσ_operator_iadd(ch, quote);
                            }
                        }
                    }
                    ret = ρσ_operator_iadd(ret, ch);
                }
                if (is_raw_literal && ρσ_equals(ret.slice(0, 3), "%js") && WHITESPACE_CHARS[ρσ_bound_index(ret[3], WHITESPACE_CHARS)]) {
                    return (token?.__call__?.bind(token) ?? token)("js", ret.slice(4).trim());
                }
                return (token?.__call__?.bind(token) ?? token)(tok_type, ret);
            };
_read_string.__argnames__ = ["is_raw_literal", "is_js_literal"];
_read_string.__module__ = "tokenizer";
undefined;

            read_string = (with_eof_error?.__call__?.bind(with_eof_error) ?? with_eof_error)("Unterminated string constant", _read_string);
            function handle_interpolated_string(string, start_tok) {
                function raise_error(err) {
                    throw new SyntaxError(err, filename, start_tok.line, start_tok.col, start_tok.pos, false);
                };
raise_error.__argnames__ = ["err"];
raise_error.__module__ = "tokenizer";
undefined;

                S["text"] = ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(S["text"].slice(0, S["pos"]), "("), (interpolate?.__call__?.bind(interpolate) ?? interpolate)(string, raise_error)), ")"), S["text"].slice(S["pos"]));
                return (token?.__call__?.bind(token) ?? token)("punc", (next?.__call__?.bind(next) ?? next)());
            };
handle_interpolated_string.__argnames__ = ["string", "start_tok"];
handle_interpolated_string.__module__ = "tokenizer";
undefined;

            function read_line_comment(shebang) {
                var i, ret;
                if (!shebang) {
                    (next?.__call__?.bind(next) ?? next)();
                }
                i = (find?.__call__?.bind(find) ?? find)("\n");
                if (i === -1) {
                    ret = S["text"].substr(S["pos"]);
                    S["pos"] = S["text"].length;
                } else {
                    ret = S["text"].substring(S["pos"], i);
                    S["pos"] = i;
                }
                return (token?.__call__?.bind(token) ?? token)((shebang) ? "shebang" : "comment1", ret, true);
            };
read_line_comment.__argnames__ = ["shebang"];
read_line_comment.__module__ = "tokenizer";
undefined;

            function read_name() {
                var name, ch;
                name = ch = "";
                while (true) {
                    ch = (peek?.__call__?.bind(peek) ?? peek)();
                    if (ch === null) {
                        break;
                    }
                    if (ch === "\\") {
                        if ((charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], ρσ_operator_add(S["pos"], 1)) === "\n") {
                            S["pos"] = ρσ_operator_iadd(S["pos"], 2);
                            continue;
                        }
                        break;
                    } else if ((is_identifier_char?.__call__?.bind(is_identifier_char) ?? is_identifier_char)(ch)) {
                        name = ρσ_operator_iadd(name, (next?.__call__?.bind(next) ?? next)());
                    } else {
                        break;
                    }
                }
                return name;
            };
read_name.__module__ = "tokenizer";
undefined;

            function do_read_regexp() {
                var prev_backslash, regexp, ch, in_class, verbose_regexp, in_comment, mods;
                prev_backslash = false;
                regexp = ch = "";
                in_class = false;
                verbose_regexp = false;
                in_comment = false;
                if ((peek?.__call__?.bind(peek) ?? peek)() === "/") {
                    (next?.__call__?.bind(next) ?? next)(true);
                    if ((peek?.__call__?.bind(peek) ?? peek)() === "/") {
                        verbose_regexp = true;
                        (next?.__call__?.bind(next) ?? next)(true);
                    } else {
                        mods = (read_name?.__call__?.bind(read_name) ?? read_name)();
                        return (token?.__call__?.bind(token) ?? token)("regexp", new RegExp(regexp, mods));
                    }
                }
                while (true) {
                    ch = (next?.__call__?.bind(next) ?? next)(true);
                    if (!ch) {
                        break;
                    }
                    if (in_comment) {
                        if (ch === "\n") {
                            in_comment = false;
                        }
                        continue;
                    }
                    if (prev_backslash) {
                        regexp = ρσ_operator_iadd(regexp, ρσ_operator_add("\\", ch));
                        prev_backslash = false;
                    } else if (ch === "[") {
                        in_class = true;
                        regexp = ρσ_operator_iadd(regexp, ch);
                    } else if (ch === "]" && in_class) {
                        in_class = false;
                        regexp = ρσ_operator_iadd(regexp, ch);
                    } else if (ch === "/" && !in_class) {
                        if (verbose_regexp) {
                            if ((peek?.__call__?.bind(peek) ?? peek)() !== "/") {
                                regexp = ρσ_operator_iadd(regexp, "\\/");
                                continue;
                            }
                            (next?.__call__?.bind(next) ?? next)(true);
                            if ((peek?.__call__?.bind(peek) ?? peek)() !== "/") {
                                regexp = ρσ_operator_iadd(regexp, "\\/\\/");
                                continue;
                            }
                            (next?.__call__?.bind(next) ?? next)(true);
                        }
                        break;
                    } else if (ch === "\\") {
                        prev_backslash = true;
                    } else if (verbose_regexp && !in_class && " \n\r\t".indexOf(ch) !== -1) {
                    } else if (verbose_regexp && !in_class && ch === "#") {
                        in_comment = true;
                    } else {
                        regexp = ρσ_operator_iadd(regexp, ch);
                    }
                }
                mods = (read_name?.__call__?.bind(read_name) ?? read_name)();
                return (token?.__call__?.bind(token) ?? token)("regexp", new RegExp(regexp, mods));
            };
do_read_regexp.__module__ = "tokenizer";
undefined;

            read_regexp = (with_eof_error?.__call__?.bind(with_eof_error) ?? with_eof_error)("Unterminated regular expression", do_read_regexp);
            function read_operator(prefix) {
                var op;
                function grow(op) {
                    var bigger;
                    if (!(peek?.__call__?.bind(peek) ?? peek)()) {
                        return op;
                    }
                    bigger = ρσ_operator_add(op, (peek?.__call__?.bind(peek) ?? peek)());
                    if (OPERATORS[(typeof bigger === "number" && bigger < 0) ? OPERATORS.length + bigger : bigger]) {
                        (next?.__call__?.bind(next) ?? next)();
                        return (grow?.__call__?.bind(grow) ?? grow)(bigger);
                    } else {
                        return op;
                    }
                };
grow.__argnames__ = ["op"];
grow.__module__ = "tokenizer";
undefined;

                op = (grow?.__call__?.bind(grow) ?? grow)(prefix || (next?.__call__?.bind(next) ?? next)());
                if (op === "->") {
                    return (token?.__call__?.bind(token) ?? token)("punc", op);
                }
                return (token?.__call__?.bind(token) ?? token)("operator", op);
            };
read_operator.__argnames__ = ["prefix"];
read_operator.__module__ = "tokenizer";
undefined;

            function handle_slash() {
                (next?.__call__?.bind(next) ?? next)();
                return (S["regex_allowed"]) ? (read_regexp?.__call__?.bind(read_regexp) ?? read_regexp)("") : (read_operator?.__call__?.bind(read_operator) ?? read_operator)("/");
            };
handle_slash.__module__ = "tokenizer";
undefined;

            function handle_dot() {
                var c;
                (next?.__call__?.bind(next) ?? next)();
                c = (peek?.__call__?.bind(peek) ?? peek)().charCodeAt(0);
                if ((is_digit?.__call__?.bind(is_digit) ?? is_digit)(c)) {
                    return (read_num?.__call__?.bind(read_num) ?? read_num)(".");
                }
                if ((is_dot?.__call__?.bind(is_dot) ?? is_dot)(c)) {
                    (next?.__call__?.bind(next) ?? next)();
                    return (token?.__call__?.bind(token) ?? token)("punc", "..");
                }
                return (token?.__call__?.bind(token) ?? token)("punc", ".");
            };
handle_dot.__module__ = "tokenizer";
undefined;

            function read_word() {
                var word;
                word = (read_name?.__call__?.bind(read_name) ?? read_name)();
                return (KEYWORDS_ATOM[(typeof word === "number" && word < 0) ? KEYWORDS_ATOM.length + word : word]) ? (token?.__call__?.bind(token) ?? token)("atom", word) : (!KEYWORDS[(typeof word === "number" && word < 0) ? KEYWORDS.length + word : word]) ? (token?.__call__?.bind(token) ?? token)("name", word) : (OPERATORS[(typeof word === "number" && word < 0) ? OPERATORS.length + word : word] && (prevChar?.__call__?.bind(prevChar) ?? prevChar)() !== ".") ? (token?.__call__?.bind(token) ?? token)("operator", word) : (token?.__call__?.bind(token) ?? token)("keyword", word);
            };
read_word.__module__ = "tokenizer";
undefined;

            function next_token() {
                var indent, ch, code, tmp_, regex_allowed, tok, mods, start_pos_for_string, stok;
                indent = (parse_whitespace?.__call__?.bind(parse_whitespace) ?? parse_whitespace)();
                if (indent === -1) {
                    return (token?.__call__?.bind(token) ?? token)("punc", "}", false, true);
                }
                (start_token?.__call__?.bind(start_token) ?? start_token)();
                ch = (peek?.__call__?.bind(peek) ?? peek)();
                if (!ch) {
                    return (token?.__call__?.bind(token) ?? token)("eof");
                }
                code = ch.charCodeAt(0);
                tmp_ = code;
                if (tmp_ === 34 || tmp_ === 39) {
                    return (read_string?.__call__?.bind(read_string) ?? read_string)(false);
                } else if (tmp_ === 35) {
                    if (S["pos"] === 0 && (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], 1) === "!") {
                        return (read_line_comment?.__call__?.bind(read_line_comment) ?? read_line_comment)(true);
                    }
                    regex_allowed = S["regex_allowed"];
                    S["comments_before"].push((read_line_comment?.__call__?.bind(read_line_comment) ?? read_line_comment)());
                    S["regex_allowed"] = regex_allowed;
                    return (next_token?.__call__?.bind(next_token) ?? next_token)();
                } else if (tmp_ === 46) {
                    return (handle_dot?.__call__?.bind(handle_dot) ?? handle_dot)();
                } else if (tmp_ === 47) {
                    return (handle_slash?.__call__?.bind(handle_slash) ?? handle_slash)();
                }
                if ((is_digit?.__call__?.bind(is_digit) ?? is_digit)(code)) {
                    return (read_num?.__call__?.bind(read_num) ?? read_num)();
                }
                if (PUNC_CHARS[(typeof ch === "number" && ch < 0) ? PUNC_CHARS.length + ch : ch]) {
                    return (token?.__call__?.bind(token) ?? token)("punc", (next?.__call__?.bind(next) ?? next)());
                }
                if (OPERATOR_CHARS[(typeof ch === "number" && ch < 0) ? OPERATOR_CHARS.length + ch : ch]) {
                    return (read_operator?.__call__?.bind(read_operator) ?? read_operator)();
                }
                if (code === 92 && (charAt?.__call__?.bind(charAt) ?? charAt)(S["text"], ρσ_operator_add(S["pos"], 1)) === "\n") {
                    (next?.__call__?.bind(next) ?? next)();
                    (next?.__call__?.bind(next) ?? next)();
                    S["newline_before"] = false;
                    return (next_token?.__call__?.bind(next_token) ?? next_token)();
                }
                if ((is_identifier_start?.__call__?.bind(is_identifier_start) ?? is_identifier_start)(code)) {
                    tok = (read_word?.__call__?.bind(read_word) ?? read_word)();
                    if ("'\"".includes((peek?.__call__?.bind(peek) ?? peek)()) && (is_string_modifier?.__call__?.bind(is_string_modifier) ?? is_string_modifier)(tok.value)) {
                        mods = tok.value.toLowerCase();
                        start_pos_for_string = S["tokpos"];
                        stok = (read_string?.__call__?.bind(read_string) ?? read_string)(mods.indexOf("r") !== -1, mods.indexOf("v") !== -1);
                        tok.endpos = stok.endpos;
                        if (stok.type !== "js" && mods.indexOf("f") !== -1) {
                            tok.col = ρσ_operator_iadd(tok.col, ρσ_operator_sub(start_pos_for_string, tok.pos));
                            return (handle_interpolated_string?.__call__?.bind(handle_interpolated_string) ?? handle_interpolated_string)(stok.value, tok);
                        }
                        tok.value = stok.value;
                        tok.type = stok.type;
                    }
                    return tok;
                }
                (parse_error?.__call__?.bind(parse_error) ?? parse_error)(ρσ_operator_add(ρσ_operator_add("Unexpected character '", ch), "'"));
            };
next_token.__module__ = "tokenizer";
undefined;

            function context(nc) {
                if (nc) {
                    S = nc;
                }
                return S;
            };
context.__argnames__ = ["nc"];
context.__module__ = "tokenizer";
undefined;

            next_token.context = context;
            return next_token;
        };
tokenizer.__argnames__ = ["raw_text", "filename"];
tokenizer.__module__ = "tokenizer";
undefined;

        ρσ_modules.tokenizer.RE_HEX_NUMBER = RE_HEX_NUMBER;
        ρσ_modules.tokenizer.RE_OCT_NUMBER = RE_OCT_NUMBER;
        ρσ_modules.tokenizer.RE_DEC_NUMBER = RE_DEC_NUMBER;
        ρσ_modules.tokenizer.OPERATOR_CHARS = OPERATOR_CHARS;
        ρσ_modules.tokenizer.ASCII_CONTROL_CHARS = ASCII_CONTROL_CHARS;
        ρσ_modules.tokenizer.HEX_PAT = HEX_PAT;
        ρσ_modules.tokenizer.NAME_PAT = NAME_PAT;
        ρσ_modules.tokenizer.OPERATORS = OPERATORS;
        ρσ_modules.tokenizer.OP_MAP = OP_MAP;
        ρσ_modules.tokenizer.WHITESPACE_CHARS = WHITESPACE_CHARS;
        ρσ_modules.tokenizer.PUNC_BEFORE_EXPRESSION = PUNC_BEFORE_EXPRESSION;
        ρσ_modules.tokenizer.PUNC_CHARS = PUNC_CHARS;
        ρσ_modules.tokenizer.keywords = keywords;
        ρσ_modules.tokenizer.keywords_atom = keywords_atom;
        ρσ_modules.tokenizer.reserved_words = reserved_words;
        ρσ_modules.tokenizer.keyword_before_expression = keyword_before_expression;
        ρσ_modules.tokenizer.ALL_KEYWORDS = ALL_KEYWORDS;
        ρσ_modules.tokenizer.KEYWORDS = KEYWORDS;
        ρσ_modules.tokenizer.RESERVED_WORDS = RESERVED_WORDS;
        ρσ_modules.tokenizer.KEYWORDS_BEFORE_EXPRESSION = KEYWORDS_BEFORE_EXPRESSION;
        ρσ_modules.tokenizer.KEYWORDS_ATOM = KEYWORDS_ATOM;
        ρσ_modules.tokenizer.IDENTIFIER_PAT = IDENTIFIER_PAT;
        ρσ_modules.tokenizer.UNICODE = UNICODE;
        ρσ_modules.tokenizer.is_string_modifier = is_string_modifier;
        ρσ_modules.tokenizer.is_letter = is_letter;
        ρσ_modules.tokenizer.is_digit = is_digit;
        ρσ_modules.tokenizer.is_dot = is_dot;
        ρσ_modules.tokenizer.is_alphanumeric_char = is_alphanumeric_char;
        ρσ_modules.tokenizer.is_unicode_combining_mark = is_unicode_combining_mark;
        ρσ_modules.tokenizer.is_unicode_connector_punctuation = is_unicode_connector_punctuation;
        ρσ_modules.tokenizer.is_identifier = is_identifier;
        ρσ_modules.tokenizer.is_identifier_start = is_identifier_start;
        ρσ_modules.tokenizer.is_identifier_char = is_identifier_char;
        ρσ_modules.tokenizer.parse_js_number = parse_js_number;
        ρσ_modules.tokenizer.is_token = is_token;
        ρσ_modules.tokenizer.tokenizer = tokenizer;
    })();

    (function(){
        var __name__ = "parse";
        var COMPILER_VERSION, PYTHON_FLAGS, NATIVE_CLASSES, ERROR_CLASSES, COMMON_STATIC, FORBIDDEN_CLASS_VARS, UNARY_PREFIX, ASSIGNMENT, PRECEDENCE, STATEMENTS_WITH_LABELS, ATOMIC_START_TOKEN, compile_time_decorators;
        var make_predicate = ρσ_modules.utils.make_predicate;
        var array_to_hash = ρσ_modules.utils.array_to_hash;
        var defaults = ρσ_modules.utils.defaults;
        var has_prop = ρσ_modules.utils.has_prop;
        var cache_file_name = ρσ_modules.utils.cache_file_name;

        var SyntaxError = ρσ_modules.errors.SyntaxError;
        var ImportError = ρσ_modules.errors.ImportError;

        var AST_Array = ρσ_modules.ast_types.AST_Array;
        var AST_Assign = ρσ_modules.ast_types.AST_Assign;
        var AST_Binary = ρσ_modules.ast_types.AST_Binary;
        var AST_BlockStatement = ρσ_modules.ast_types.AST_BlockStatement;
        var AST_Break = ρσ_modules.ast_types.AST_Break;
        var AST_Call = ρσ_modules.ast_types.AST_Call;
        var AST_Catch = ρσ_modules.ast_types.AST_Catch;
        var AST_Class = ρσ_modules.ast_types.AST_Class;
        var AST_ClassCall = ρσ_modules.ast_types.AST_ClassCall;
        var AST_Conditional = ρσ_modules.ast_types.AST_Conditional;
        var AST_Constant = ρσ_modules.ast_types.AST_Constant;
        var AST_Continue = ρσ_modules.ast_types.AST_Continue;
        var AST_DWLoop = ρσ_modules.ast_types.AST_DWLoop;
        var AST_Debugger = ρσ_modules.ast_types.AST_Debugger;
        var AST_Decorator = ρσ_modules.ast_types.AST_Decorator;
        var AST_Definitions = ρσ_modules.ast_types.AST_Definitions;
        var AST_DictComprehension = ρσ_modules.ast_types.AST_DictComprehension;
        var AST_Directive = ρσ_modules.ast_types.AST_Directive;
        var AST_Do = ρσ_modules.ast_types.AST_Do;
        var AST_Dot = ρσ_modules.ast_types.AST_Dot;
        var AST_EllipsesRange = ρσ_modules.ast_types.AST_EllipsesRange;
        var AST_Else = ρσ_modules.ast_types.AST_Else;
        var AST_EmptyStatement = ρσ_modules.ast_types.AST_EmptyStatement;
        var AST_Except = ρσ_modules.ast_types.AST_Except;
        var AST_ExpressiveObject = ρσ_modules.ast_types.AST_ExpressiveObject;
        var AST_False = ρσ_modules.ast_types.AST_False;
        var AST_Finally = ρσ_modules.ast_types.AST_Finally;
        var AST_ForIn = ρσ_modules.ast_types.AST_ForIn;
        var AST_ForJS = ρσ_modules.ast_types.AST_ForJS;
        var AST_Function = ρσ_modules.ast_types.AST_Function;
        var AST_GeneratorComprehension = ρσ_modules.ast_types.AST_GeneratorComprehension;
        var AST_Hole = ρσ_modules.ast_types.AST_Hole;
        var AST_If = ρσ_modules.ast_types.AST_If;
        var AST_Import = ρσ_modules.ast_types.AST_Import;
        var AST_ImportedVar = ρσ_modules.ast_types.AST_ImportedVar;
        var AST_Imports = ρσ_modules.ast_types.AST_Imports;
        var AST_ListComprehension = ρσ_modules.ast_types.AST_ListComprehension;
        var AST_Method = ρσ_modules.ast_types.AST_Method;
        var AST_New = ρσ_modules.ast_types.AST_New;
        var AST_Null = ρσ_modules.ast_types.AST_Null;
        var AST_Number = ρσ_modules.ast_types.AST_Number;
        var AST_Object = ρσ_modules.ast_types.AST_Object;
        var AST_ObjectKeyVal = ρσ_modules.ast_types.AST_ObjectKeyVal;
        var AST_PropAccess = ρσ_modules.ast_types.AST_PropAccess;
        var AST_RegExp = ρσ_modules.ast_types.AST_RegExp;
        var AST_Return = ρσ_modules.ast_types.AST_Return;
        var AST_Scope = ρσ_modules.ast_types.AST_Scope;
        var AST_Set = ρσ_modules.ast_types.AST_Set;
        var AST_SetComprehension = ρσ_modules.ast_types.AST_SetComprehension;
        var AST_SetItem = ρσ_modules.ast_types.AST_SetItem;
        var AST_Seq = ρσ_modules.ast_types.AST_Seq;
        var AST_SimpleStatement = ρσ_modules.ast_types.AST_SimpleStatement;
        var AST_Splice = ρσ_modules.ast_types.AST_Splice;
        var AST_String = ρσ_modules.ast_types.AST_String;
        var AST_Sub = ρσ_modules.ast_types.AST_Sub;
        var AST_ItemAccess = ρσ_modules.ast_types.AST_ItemAccess;
        var AST_SymbolAlias = ρσ_modules.ast_types.AST_SymbolAlias;
        var AST_SymbolCatch = ρσ_modules.ast_types.AST_SymbolCatch;
        var AST_SymbolDefun = ρσ_modules.ast_types.AST_SymbolDefun;
        var AST_SymbolFunarg = ρσ_modules.ast_types.AST_SymbolFunarg;
        var AST_SymbolLambda = ρσ_modules.ast_types.AST_SymbolLambda;
        var AST_SymbolNonlocal = ρσ_modules.ast_types.AST_SymbolNonlocal;
        var AST_SymbolRef = ρσ_modules.ast_types.AST_SymbolRef;
        var AST_SymbolVar = ρσ_modules.ast_types.AST_SymbolVar;
        var AST_This = ρσ_modules.ast_types.AST_This;
        var AST_Throw = ρσ_modules.ast_types.AST_Throw;
        var AST_Toplevel = ρσ_modules.ast_types.AST_Toplevel;
        var AST_True = ρσ_modules.ast_types.AST_True;
        var AST_Try = ρσ_modules.ast_types.AST_Try;
        var AST_UnaryPrefix = ρσ_modules.ast_types.AST_UnaryPrefix;
        var AST_Undefined = ρσ_modules.ast_types.AST_Undefined;
        var AST_Var = ρσ_modules.ast_types.AST_Var;
        var AST_VarDef = ρσ_modules.ast_types.AST_VarDef;
        var AST_Verbatim = ρσ_modules.ast_types.AST_Verbatim;
        var AST_While = ρσ_modules.ast_types.AST_While;
        var AST_With = ρσ_modules.ast_types.AST_With;
        var AST_WithClause = ρσ_modules.ast_types.AST_WithClause;
        var AST_Yield = ρσ_modules.ast_types.AST_Yield;
        var AST_Assert = ρσ_modules.ast_types.AST_Assert;
        var AST_Existential = ρσ_modules.ast_types.AST_Existential;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        var tokenizer = ρσ_modules.tokenizer.tokenizer;
        var is_token = ρσ_modules.tokenizer.is_token;
        var RESERVED_WORDS = ρσ_modules.tokenizer.RESERVED_WORDS;

        var js_new = ρσ_modules.js.js_new;

        COMPILER_VERSION = "006f1ff8db17bdfc51fd0753abb86919266efca5";
        PYTHON_FLAGS = {"exponent":true,"ellipses":true,"annotations":false,"dict_literals":true,"overload_getitem":true,"bound_methods":true,"hash_literals":true};
        function get_compiler_version() {
            return COMPILER_VERSION;
        };
get_compiler_version.__module__ = "parse";
undefined;

        function static_predicate(names) {
            return (function() {
                var ρσ_Iter = names.split(" "), ρσ_Result = Object.create(null), k;
                ρσ_Iter = ((typeof ρσ_Iter[Symbol.iterator] === "function") ? (ρσ_Iter instanceof Map ? ρσ_Iter.keys() : ρσ_Iter) : Object.keys(ρσ_Iter));
                for (var ρσ_Index of ρσ_Iter) {
                    k = ρσ_Index;
                    ρσ_Result[k] = (true);
                }
                return ρσ_Result;
            })();
        };
static_predicate.__argnames__ = ["names"];
static_predicate.__module__ = "parse";
undefined;

        NATIVE_CLASSES = {"Image":Object.create(null),"FileReader":Object.create(null),"RegExp":Object.create(null),"Error":Object.create(null),"EvalError":Object.create(null),"InternalError":Object.create(null),"RangeError":Object.create(null),"RumtimeError":Object.create(null),"ReferenceError":Object.create(null),"SyntaxError":Object.create(null),"TypeError":Object.create(null),"URIError":Object.create(null),"Object":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("getOwnPropertyNames getOwnPropertyDescriptor getOwnPropertyDescriptors getOwnPropertySymbols keys entries values create defineProperty defineProperties getPrototypeOf setPrototypeOf assign seal isSealed is preventExtensions isExtensible freeze isFrozen")},"String":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("fromCharCode")},"Array":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("isArray from of")},"Function":Object.create(null),"Date":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("UTC now parse")},"ArrayBuffer":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("isView transfer")},"DataView":Object.create(null),"Float32Array":Object.create(null),"Float64Array":Object.create(null),"Int16Array":Object.create(null),"Int32Array":Object.create(null),"Int8Array":Object.create(null),"Uint16Array":Object.create(null),"Uint32Array":Object.create(null),"Uint8Array":Object.create(null),"Uint8ClampedArray":Object.create(null),"Map":Object.create(null),"WeakMap":Object.create(null),"Proxy":Object.create(null),"Set":Object.create(null),"WeakSet":Object.create(null),"Promise":{"static":(static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("all race reject resolve")},"WebSocket":Object.create(null),"XMLHttpRequest":Object.create(null),"TextEncoder":Object.create(null),"TextDecoder":Object.create(null),"MouseEvent":Object.create(null),"Event":Object.create(null),"CustomEvent":Object.create(null),"Blob":Object.create(null)};
        ERROR_CLASSES = {"Exception":Object.create(null),"AttributeError":Object.create(null),"IndexError":Object.create(null),"KeyError":Object.create(null),"ValueError":Object.create(null),"UnicodeDecodeError":Object.create(null),"AssertionError":Object.create(null),"ZeroDivisionError":Object.create(null)};
        COMMON_STATIC = (static_predicate?.__call__?.bind(static_predicate) ?? static_predicate)("call apply bind toString");
        FORBIDDEN_CLASS_VARS = "prototype constructor".split(" ");
        UNARY_PREFIX = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)("typeof void delete ~ - + ! @");
        ASSIGNMENT = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)("= += -= /= //= *= %= >>= <<= >>>= |= ^= &=");
        function operator_to_precedence(a) {
            var op_to_prec, b, j, i;
            op_to_prec = Object.create(null);
            for (var ρσ_Index35 = 0; ρσ_Index35 < a.length; ρσ_Index35++) {
                i = ρσ_Index35;
                b = a[(typeof i === "number" && i < 0) ? a.length + i : i];
                for (var ρσ_Index36 = 0; ρσ_Index36 < b.length; ρσ_Index36++) {
                    j = ρσ_Index36;
                    op_to_prec[ρσ_bound_index(b[(typeof j === "number" && j < 0) ? b.length + j : j], op_to_prec)] = ρσ_operator_add(i, 1);
                }
            }
            return op_to_prec;
        };
operator_to_precedence.__argnames__ = ["a"];
operator_to_precedence.__module__ = "parse";
undefined;

        PRECEDENCE = (operator_to_precedence?.__call__?.bind(operator_to_precedence) ?? operator_to_precedence)(ρσ_list_decorate([ ρσ_list_decorate([ "||" ]), ρσ_list_decorate([ "&&" ]), ρσ_list_decorate([ "|" ]), ρσ_list_decorate([ "^" ]), ρσ_list_decorate([ "&" ]), ρσ_list_decorate([ "==", "===", "!=", "!==" ]), ρσ_list_decorate([ "<", ">", "<=", ">=", "in", "nin", "instanceof" ]), ρσ_list_decorate([ ">>", "<<", ">>>" ]), ρσ_list_decorate([ "+", "-" ]), ρσ_list_decorate([ "*", "/", "//", "%" ]), ρσ_list_decorate([ "**" ]) ]));
        STATEMENTS_WITH_LABELS = (array_to_hash?.__call__?.bind(array_to_hash) ?? array_to_hash)(ρσ_list_decorate([ "for", "do", "while", "switch" ]));
        ATOMIC_START_TOKEN = (array_to_hash?.__call__?.bind(array_to_hash) ?? array_to_hash)(ρσ_list_decorate([ "atom", "num", "string", "regexp", "name", "js" ]));
        compile_time_decorators = ρσ_list_decorate([ "staticmethod", "external", "property" ]);
        function has_simple_decorator(decorators, name) {
            var remove, s, i;
            remove = ρσ_list_decorate([]);
            for (var ρσ_Index37 = 0; ρσ_Index37 < decorators.length; ρσ_Index37++) {
                i = ρσ_Index37;
                s = decorators[(typeof i === "number" && i < 0) ? decorators.length + i : i];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(s, AST_SymbolRef) && !s.parens && s.name === name) {
                    remove.push(i);
                }
            }
            if (remove.length) {
                remove.reverse();
                for (var ρσ_Index38 = 0; ρσ_Index38 < remove.length; ρσ_Index38++) {
                    i = ρσ_Index38;
                    decorators.splice(remove[(typeof i === "number" && i < 0) ? remove.length + i : i], 1);
                }
                return true;
            }
            return false;
        };
has_simple_decorator.__argnames__ = ["decorators", "name"];
has_simple_decorator.__module__ = "parse";
undefined;

        function has_setter_decorator(decorators, name) {
            var remove, s, i;
            remove = ρσ_list_decorate([]);
            for (var ρσ_Index39 = 0; ρσ_Index39 < decorators.length; ρσ_Index39++) {
                i = ρσ_Index39;
                s = decorators[(typeof i === "number" && i < 0) ? decorators.length + i : i];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(s, AST_Dot) && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(s.expression, AST_SymbolRef) && s.expression.name === name && s.property === "setter") {
                    remove.push(i);
                }
            }
            if (remove.length) {
                remove.reverse();
                for (var ρσ_Index40 = 0; ρσ_Index40 < remove.length; ρσ_Index40++) {
                    i = ρσ_Index40;
                    decorators.splice(remove[(typeof i === "number" && i < 0) ? remove.length + i : i], 1);
                }
                return true;
            }
            return false;
        };
has_setter_decorator.__argnames__ = ["decorators", "name"];
has_setter_decorator.__module__ = "parse";
undefined;

        function create_parser_ctx(S, import_dirs, module_id, baselib_items, imported_module_ids, imported_modules, importing_modules, options) {
            function next() {
                S.prev = S.token;
                if (S.peeked.length) {
                    S.token = S.peeked.shift();
                } else {
                    S.token = S.input();
                }
                if (options.tokens) {
                    (print?.__call__?.bind(print) ?? print)("token", S.token.type, S.token.value);
                }
                return S.token;
            };
next.__module__ = "parse";
undefined;

            function is_(type, value) {
                return (is_token?.__call__?.bind(is_token) ?? is_token)(S.token, type, value);
            };
is_.__argnames__ = ["type", "value"];
is_.__module__ = "parse";
undefined;

            function peek() {
                if (!S.peeked.length) {
                    S.peeked.push(S.input());
                }
                return S.peeked[0];
            };
peek.__module__ = "parse";
undefined;

            function prev() {
                return S.prev;
            };
prev.__module__ = "parse";
undefined;

            function croak(msg, line, col, pos, is_eof) {
                var ctx;
                ctx = S.input.context();
                throw new SyntaxError(msg, ctx.filename, (line !== undefined) ? line : ctx.tokline, (col !== undefined) ? col : ctx.tokcol, (pos !== undefined) ? pos : ctx.tokpos, is_eof);
            };
croak.__argnames__ = ["msg", "line", "col", "pos", "is_eof"];
croak.__module__ = "parse";
undefined;

            function token_error(token, msg) {
                var is_eof;
                is_eof = token.type === "eof";
                (croak?.__call__?.bind(croak) ?? croak)(msg, token.line, token.col, undefined, is_eof);
            };
token_error.__argnames__ = ["token", "msg"];
token_error.__module__ = "parse";
undefined;

            function unexpected(token) {
                if (token === undefined) {
                    token = S.token;
                }
                if (token.type === "operator" && (token.value === "^^" || typeof token.value === "object" && ρσ_equals(token.value, "^^"))) {
                    (croak?.__call__?.bind(croak) ?? croak)("Use 'from __python__ import exponent' to support the a^^b is a xor b and a^b is a**b");
                }
                (token_error?.__call__?.bind(token_error) ?? token_error)(token, ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("Unexpected token: ", token.type), " '"), token.value), "'"));
            };
unexpected.__argnames__ = ["token"];
unexpected.__module__ = "parse";
undefined;

            function expect_token(type, val) {
                if ((is_?.__call__?.bind(is_) ?? is_)(type, val)) {
                    return (next?.__call__?.bind(next) ?? next)();
                }
                (token_error?.__call__?.bind(token_error) ?? token_error)(S.token, ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("Unexpected token: found type='", S.token.type), "', value='"), S.token.value), "'"), ";  expected: '"), type), "', value='"), val), "'"));
            };
expect_token.__argnames__ = ["type", "val"];
expect_token.__module__ = "parse";
undefined;

            function expect(punc) {
                return (expect_token?.__call__?.bind(expect_token) ?? expect_token)("punc", punc);
            };
expect.__argnames__ = ["punc"];
expect.__module__ = "parse";
undefined;

            function semicolon() {
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ";")) {
                    (next?.__call__?.bind(next) ?? next)();
                    S.token.nlb = true;
                }
            };
semicolon.__module__ = "parse";
undefined;

            function embed_tokens(parser) {
                function with_embedded_tokens() {
                    var start, expr, end;
                    start = S.token;
                    expr = (parser?.__call__?.bind(parser) ?? parser)();
                    if (expr === undefined) {
                        (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                    }
                    end = (prev?.__call__?.bind(prev) ?? prev)();
                    expr.start = start;
                    expr.end = end;
                    return expr;
                };
with_embedded_tokens.__module__ = "parse";
undefined;

                return with_embedded_tokens;
            };
embed_tokens.__argnames__ = ["parser"];
embed_tokens.__module__ = "parse";
undefined;

            function scan_for_top_level_callables(body) {
                var ans, opt, x, obj;
                ans = [];
                if (Array.isArray(body)) {
                    var ρσ_Iter41 = body;
                    ρσ_Iter41 = ((typeof ρσ_Iter41[Symbol.iterator] === "function") ? (ρσ_Iter41 instanceof Map ? ρσ_Iter41.keys() : ρσ_Iter41) : Object.keys(ρσ_Iter41));
                    for (var ρσ_Index41 of ρσ_Iter41) {
                        obj = ρσ_Index41;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(obj, AST_Function) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(obj, AST_Class)) {
                            if (obj.name) {
                                ans.push(obj.name.name);
                            } else {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(obj.start, "Top-level functions must have names");
                            }
                        } else {
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(obj, AST_Scope)) {
                                continue;
                            }
                            var ρσ_Iter42 = ρσ_list_decorate([ "body", "alternative" ]);
                            ρσ_Iter42 = ((typeof ρσ_Iter42[Symbol.iterator] === "function") ? (ρσ_Iter42 instanceof Map ? ρσ_Iter42.keys() : ρσ_Iter42) : Object.keys(ρσ_Iter42));
                            for (var ρσ_Index42 of ρσ_Iter42) {
                                x = ρσ_Index42;
                                opt = obj[(typeof x === "number" && x < 0) ? obj.length + x : x];
                                if (opt) {
                                    ans = ans.concat((scan_for_top_level_callables?.__call__?.bind(scan_for_top_level_callables) ?? scan_for_top_level_callables)(opt));
                                }
                                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(opt, AST_Assign) && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(opt.right, AST_Scope))) {
                                    ans = ans.concat((scan_for_top_level_callables?.__call__?.bind(scan_for_top_level_callables) ?? scan_for_top_level_callables)(opt.right));
                                }
                            }
                        }
                    }
                } else if (body.body) {
                    ans = ans.concat((scan_for_top_level_callables?.__call__?.bind(scan_for_top_level_callables) ?? scan_for_top_level_callables)(body.body));
                    if (body.alternative) {
                        ans = ans.concat((scan_for_top_level_callables?.__call__?.bind(scan_for_top_level_callables) ?? scan_for_top_level_callables)(body.alternative));
                    }
                }
                return ans;
            };
scan_for_top_level_callables.__argnames__ = ["body"];
scan_for_top_level_callables.__module__ = "parse";
undefined;

            function scan_for_classes(body) {
                var ans, obj;
                ans = Object.create(null);
                var ρσ_Iter43 = body;
                ρσ_Iter43 = ((typeof ρσ_Iter43[Symbol.iterator] === "function") ? (ρσ_Iter43 instanceof Map ? ρσ_Iter43.keys() : ρσ_Iter43) : Object.keys(ρσ_Iter43));
                for (var ρσ_Index43 of ρσ_Iter43) {
                    obj = ρσ_Index43;
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(obj, AST_Class)) {
                        ans[ρσ_bound_index(obj.name.name, ans)] = obj;
                    }
                }
                return ans;
            };
scan_for_classes.__argnames__ = ["body"];
scan_for_classes.__module__ = "parse";
undefined;

            function scan_for_local_vars(body) {
                var localvars, seen, opt, option, clause, stmt, is_compound_assign, lhs;
                localvars = [];
                seen = Object.create(null);
                function push(x) {
                    if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(seen, x)) {
                        return;
                    }
                    seen[(typeof x === "number" && x < 0) ? seen.length + x : x] = true;
                    localvars.push(x);
                };
push.__argnames__ = ["x"];
push.__module__ = "parse";
undefined;

                function extend(arr) {
                    var x;
                    var ρσ_Iter44 = arr;
                    ρσ_Iter44 = ((typeof ρσ_Iter44[Symbol.iterator] === "function") ? (ρσ_Iter44 instanceof Map ? ρσ_Iter44.keys() : ρσ_Iter44) : Object.keys(ρσ_Iter44));
                    for (var ρσ_Index44 of ρσ_Iter44) {
                        x = ρσ_Index44;
                        (push?.__call__?.bind(push) ?? push)(x);
                    }
                };
extend.__argnames__ = ["arr"];
extend.__module__ = "parse";
undefined;

                function scan_in_array(arr) {
                    var x;
                    var ρσ_Iter45 = arr;
                    ρσ_Iter45 = ((typeof ρσ_Iter45[Symbol.iterator] === "function") ? (ρσ_Iter45 instanceof Map ? ρσ_Iter45.keys() : ρσ_Iter45) : Object.keys(ρσ_Iter45));
                    for (var ρσ_Index45 of ρσ_Iter45) {
                        x = ρσ_Index45;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Seq)) {
                            x = x.to_array();
                        } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Array)) {
                            x = x.elements;
                        }
                        if (Array.isArray(x)) {
                            (scan_in_array?.__call__?.bind(scan_in_array) ?? scan_in_array)(x);
                        } else {
                            if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_PropAccess)) {
                                (push?.__call__?.bind(push) ?? push)(x.name);
                            }
                        }
                    }
                };
scan_in_array.__argnames__ = ["arr"];
scan_in_array.__module__ = "parse";
undefined;

                function add_assign_lhs(lhs) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Seq)) {
                        lhs = new AST_Array({"elements":lhs.to_array()});
                    }
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Array)) {
                        (push?.__call__?.bind(push) ?? push)("ρσ_unpack");
                        (scan_in_array?.__call__?.bind(scan_in_array) ?? scan_in_array)(lhs.elements);
                    } else if (lhs.name) {
                        (push?.__call__?.bind(push) ?? push)(lhs.name);
                    }
                };
add_assign_lhs.__argnames__ = ["lhs"];
add_assign_lhs.__module__ = "parse";
undefined;

                function add_for_in(stmt) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt.init, AST_Array)) {
                        (push?.__call__?.bind(push) ?? push)("ρσ_unpack");
                        (scan_in_array?.__call__?.bind(scan_in_array) ?? scan_in_array)(stmt.init.elements);
                    } else {
                        (push?.__call__?.bind(push) ?? push)(stmt.init.name);
                    }
                };
add_for_in.__argnames__ = ["stmt"];
add_for_in.__module__ = "parse";
undefined;

                if (Array.isArray(body)) {
                    var ρσ_Iter46 = body;
                    ρσ_Iter46 = ((typeof ρσ_Iter46[Symbol.iterator] === "function") ? (ρσ_Iter46 instanceof Map ? ρσ_Iter46.keys() : ρσ_Iter46) : Object.keys(ρσ_Iter46));
                    for (var ρσ_Index46 of ρσ_Iter46) {
                        stmt = ρσ_Index46;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Scope)) {
                            continue;
                        }
                        var ρσ_Iter47 = ρσ_list_decorate([ "body", "alternative", "bcatch", "condition" ]);
                        ρσ_Iter47 = ((typeof ρσ_Iter47[Symbol.iterator] === "function") ? (ρσ_Iter47 instanceof Map ? ρσ_Iter47.keys() : ρσ_Iter47) : Object.keys(ρσ_Iter47));
                        for (var ρσ_Index47 of ρσ_Iter47) {
                            option = ρσ_Index47;
                            opt = stmt[(typeof option === "number" && option < 0) ? stmt.length + option : option];
                            if (opt) {
                                (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(opt));
                            }
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(opt, AST_Assign) && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(opt.right, AST_Scope))) {
                                (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(opt.right));
                            }
                        }
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_ForIn)) {
                            (add_for_in?.__call__?.bind(add_for_in) ?? add_for_in)(stmt);
                        } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_DWLoop)) {
                            (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(stmt));
                        } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_With)) {
                            [(push?.__call__?.bind(push) ?? push)("ρσ_with_exception"), (push?.__call__?.bind(push) ?? push)("ρσ_with_suppress")];
                            var ρσ_Iter48 = stmt.clauses;
                            ρσ_Iter48 = ((typeof ρσ_Iter48[Symbol.iterator] === "function") ? (ρσ_Iter48 instanceof Map ? ρσ_Iter48.keys() : ρσ_Iter48) : Object.keys(ρσ_Iter48));
                            for (var ρσ_Index48 of ρσ_Iter48) {
                                clause = ρσ_Index48;
                                if (clause.alias) {
                                    (push?.__call__?.bind(push) ?? push)(clause.alias.name);
                                }
                            }
                        }
                    }
                } else if (body.body) {
                    (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(body.body));
                    if (body.alternative) {
                        (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(body.alternative));
                    }
                } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(body, AST_Assign)) {
                    if (body.is_chained()) {
                        is_compound_assign = false;
                        var ρσ_Iter49 = body.traverse_chain()[0];
                        ρσ_Iter49 = ((typeof ρσ_Iter49[Symbol.iterator] === "function") ? (ρσ_Iter49 instanceof Map ? ρσ_Iter49.keys() : ρσ_Iter49) : Object.keys(ρσ_Iter49));
                        for (var ρσ_Index49 of ρσ_Iter49) {
                            lhs = ρσ_Index49;
                            (add_assign_lhs?.__call__?.bind(add_assign_lhs) ?? add_assign_lhs)(lhs);
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Seq) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Array)) {
                                is_compound_assign = true;
                                break;
                            }
                        }
                        if (is_compound_assign) {
                            (push?.__call__?.bind(push) ?? push)("ρσ_chain_assign_temp");
                        }
                    } else {
                        (add_assign_lhs?.__call__?.bind(add_assign_lhs) ?? add_assign_lhs)(body.left);
                    }
                    if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(body.right, AST_Scope)) {
                        (extend?.__call__?.bind(extend) ?? extend)((scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(body.right));
                    }
                } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(body, AST_ForIn)) {
                    (add_for_in?.__call__?.bind(add_for_in) ?? add_for_in)(body);
                }
                return localvars;
            };
scan_for_local_vars.__argnames__ = ["body"];
scan_for_local_vars.__module__ = "parse";
undefined;

            function scan_for_nonlocal_defs(body) {
                var vardef, opt, option, stmt;
                vars = [];
                if (Array.isArray(body)) {
                    var ρσ_Iter50 = body;
                    ρσ_Iter50 = ((typeof ρσ_Iter50[Symbol.iterator] === "function") ? (ρσ_Iter50 instanceof Map ? ρσ_Iter50.keys() : ρσ_Iter50) : Object.keys(ρσ_Iter50));
                    for (var ρσ_Index50 of ρσ_Iter50) {
                        stmt = ρσ_Index50;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Scope)) {
                            continue;
                        }
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Definitions)) {
                            var ρσ_Iter51 = stmt.definitions;
                            ρσ_Iter51 = ((typeof ρσ_Iter51[Symbol.iterator] === "function") ? (ρσ_Iter51 instanceof Map ? ρσ_Iter51.keys() : ρσ_Iter51) : Object.keys(ρσ_Iter51));
                            for (var ρσ_Index51 of ρσ_Iter51) {
                                vardef = ρσ_Index51;
                                vars.push(vardef.name.name);
                            }
                        }
                        var ρσ_Iter52 = ρσ_list_decorate([ "body", "alternative" ]);
                        ρσ_Iter52 = ((typeof ρσ_Iter52[Symbol.iterator] === "function") ? (ρσ_Iter52 instanceof Map ? ρσ_Iter52.keys() : ρσ_Iter52) : Object.keys(ρσ_Iter52));
                        for (var ρσ_Index52 of ρσ_Iter52) {
                            option = ρσ_Index52;
                            var vars;
                            opt = stmt[(typeof option === "number" && option < 0) ? stmt.length + option : option];
                            if (opt) {
                                vars = vars.concat((scan_for_nonlocal_defs?.__call__?.bind(scan_for_nonlocal_defs) ?? scan_for_nonlocal_defs)(opt));
                            }
                        }
                    }
                } else if (body.body) {
                    vars = vars.concat((scan_for_nonlocal_defs?.__call__?.bind(scan_for_nonlocal_defs) ?? scan_for_nonlocal_defs)(body.body));
                    if (body.alternative) {
                        vars = vars.concat((scan_for_nonlocal_defs?.__call__?.bind(scan_for_nonlocal_defs) ?? scan_for_nonlocal_defs)(body.alternative));
                    }
                }
                return vars;
            };
scan_for_nonlocal_defs.__argnames__ = ["body"];
scan_for_nonlocal_defs.__module__ = "parse";
undefined;

            function return_() {
                var value, is_end_of_statement;
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ";")) {
                    (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                    value = null;
                } else {
                    is_end_of_statement = S.token.nlb || (is_?.__call__?.bind(is_) ?? is_)("eof") || (is_?.__call__?.bind(is_) ?? is_)("punc", "}");
                    if (is_end_of_statement) {
                        value = null;
                    } else {
                        value = (expression?.__call__?.bind(expression) ?? expression)(true);
                        (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                    }
                }
                return value;
            };
return_.__module__ = "parse";
undefined;

            
            var statement = embed_tokens((function() {
                var ρσ_anonfunc = function statement() {
                    var tmp_, p, while_cond, start, func, chain, cond, msg, tmp;
                    if (S.token.type === "operator" && S.token.value.substr(0, 1) === "/") {
                        (token_error?.__call__?.bind(token_error) ?? token_error)(S.token, "RapydScript does not support statements starting with regexp literals");
                    }
                    S.statement_starting_token = S.token;
                    tmp_ = S.token.type;
                    p = (prev?.__call__?.bind(prev) ?? prev)();
                    if (p && !S.token.nlb && ATOMIC_START_TOKEN[ρσ_bound_index(p.type, ATOMIC_START_TOKEN)] && !(is_?.__call__?.bind(is_) ?? is_)("punc", ":") && !(is_?.__call__?.bind(is_) ?? is_)("punc", ";")) {
                        (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                    }
                    if (tmp_ === "string") {
                        return (simple_statement?.__call__?.bind(simple_statement) ?? simple_statement)();
                    } else if (tmp_ === "shebang") {
                        tmp_ = S.token.value;
                        (next?.__call__?.bind(next) ?? next)();
                        return new AST_Directive({"value":tmp_});
                    } else if (tmp_ === "num" || tmp_ === "regexp" || tmp_ === "operator" || tmp_ === "atom" || tmp_ === "js") {
                        return (simple_statement?.__call__?.bind(simple_statement) ?? simple_statement)();
                    } else if (tmp_ === "punc") {
                        tmp_ = S.token.value;
                        if (tmp_ === ":") {
                            return new AST_BlockStatement({"start":S.token,"body":(block_?.__call__?.bind(block_) ?? block_)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                        } else if (tmp_ === "{" || tmp_ === "[" || tmp_ === "(") {
                            return (simple_statement?.__call__?.bind(simple_statement) ?? simple_statement)();
                        } else if (tmp_ === ";") {
                            (next?.__call__?.bind(next) ?? next)();
                            return new AST_EmptyStatement({"stype":";","start":(prev?.__call__?.bind(prev) ?? prev)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                        } else {
                            (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                        }
                    } else if (tmp_ === "name") {
                        if ((is_token?.__call__?.bind(is_token) ?? is_token)((peek?.__call__?.bind(peek) ?? peek)(), "punc", ":")) {
                            (token_error?.__call__?.bind(token_error) ?? token_error)((peek?.__call__?.bind(peek) ?? peek)(), "invalid syntax, colon not allowed here");
                        }
                        return (simple_statement?.__call__?.bind(simple_statement) ?? simple_statement)();
                    } else if (tmp_ === "keyword") {
                        tmp_ = S.token.value;
                        (next?.__call__?.bind(next) ?? next)();
                        if (tmp_ === "break") {
                            return (break_cont?.__call__?.bind(break_cont) ?? break_cont)(AST_Break);
                        } else if (tmp_ === "continue") {
                            return (break_cont?.__call__?.bind(break_cont) ?? break_cont)(AST_Continue);
                        } else if (tmp_ === "debugger") {
                            (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                            return new AST_Debugger;
                        } else if (tmp_ === "do") {
                            function get_condition() {
                                var tmp;
                                (expect?.__call__?.bind(expect) ?? expect)(".");
                                (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "while");
                                tmp = (expression?.__call__?.bind(expression) ?? expression)(true);
                                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(tmp, AST_Assign)) {
                                    (croak?.__call__?.bind(croak) ?? croak)("Assignments in do loop conditions are not allowed");
                                }
                                (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                                return tmp;
                            };
get_condition.__module__ = "parse";
undefined;

                            return new AST_Do({"body":(in_loop?.__call__?.bind(in_loop) ?? in_loop)(statement),"condition":(get_condition?.__call__?.bind(get_condition) ?? get_condition)()});
                        } else if (tmp_ === "while") {
                            while_cond = (expression?.__call__?.bind(expression) ?? expression)(true);
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(while_cond, AST_Assign)) {
                                (croak?.__call__?.bind(croak) ?? croak)("Assignments in while loop conditions are not allowed");
                            }
                            if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                                (croak?.__call__?.bind(croak) ?? croak)("Expected a colon after the while statement");
                            }
                            return new AST_While({"condition":while_cond,"body":(in_loop?.__call__?.bind(in_loop) ?? in_loop)(statement)});
                        } else if (tmp_ === "for") {
                            if ((is_?.__call__?.bind(is_) ?? is_)("js")) {
                                return (for_js?.__call__?.bind(for_js) ?? for_js)();
                            }
                            return (for_?.__call__?.bind(for_) ?? for_)();
                        } else if (tmp_ === "from") {
                            return (import_?.__call__?.bind(import_) ?? import_)(true);
                        } else if (tmp_ === "import") {
                            return (import_?.__call__?.bind(import_) ?? import_)(false);
                        } else if (tmp_ === "class") {
                            return (class_?.__call__?.bind(class_) ?? class_)();
                        } else if (tmp_ === "def") {
                            start = (prev?.__call__?.bind(prev) ?? prev)();
                            func = (function_?.__call__?.bind(function_) ?? function_)((ρσ_expr_temp = S.in_class)[ρσ_expr_temp.length-1], false, false);
                            func.start = start;
                            func.end = (prev?.__call__?.bind(prev) ?? prev)();
                            chain = (subscripts?.__call__?.bind(subscripts) ?? subscripts)(func, true);
                            if (chain === func) {
                                return func;
                            } else {
                                return new AST_SimpleStatement({"start":start,"body":chain,"end":(prev?.__call__?.bind(prev) ?? prev)()});
                            }
                        } else if (tmp_ === "assert") {
                            start = (prev?.__call__?.bind(prev) ?? prev)();
                            cond = (expression?.__call__?.bind(expression) ?? expression)(false);
                            msg = null;
                            if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                                (next?.__call__?.bind(next) ?? next)();
                                msg = (expression?.__call__?.bind(expression) ?? expression)(false);
                            }
                            return new AST_Assert({"start":start,"condition":cond,"message":msg,"end":(prev?.__call__?.bind(prev) ?? prev)()});
                        } else if (tmp_ === "if") {
                            return (if_?.__call__?.bind(if_) ?? if_)();
                        } else if (tmp_ === "pass") {
                            (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                            return new AST_EmptyStatement({"stype":"pass","start":(prev?.__call__?.bind(prev) ?? prev)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                        } else if (tmp_ === "return") {
                            if (S.in_function === 0) {
                                (croak?.__call__?.bind(croak) ?? croak)("'return' outside of function");
                            }
                            if ((ρσ_expr_temp = S.functions)[ρσ_expr_temp.length-1].is_generator) {
                                (croak?.__call__?.bind(croak) ?? croak)("'return' not allowed in a function with yield");
                            }
                            (ρσ_expr_temp = S.functions)[ρσ_expr_temp.length-1].is_generator = false;
                            return new AST_Return({"value":(return_?.__call__?.bind(return_) ?? return_)()});
                        } else if (tmp_ === "yield") {
                            return (yield_?.__call__?.bind(yield_) ?? yield_)();
                        } else if (tmp_ === "raise") {
                            if (S.token.nlb) {
                                return new AST_Throw({"value":new AST_SymbolCatch({"name":"ρσ_Exception"})});
                            }
                            tmp = (expression?.__call__?.bind(expression) ?? expression)(true);
                            (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                            return new AST_Throw({"value":tmp});
                        } else if (tmp_ === "try") {
                            return (try_?.__call__?.bind(try_) ?? try_)();
                        } else if (tmp_ === "nonlocal") {
                            tmp = (nonlocal_?.__call__?.bind(nonlocal_) ?? nonlocal_)();
                            (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                            return tmp;
                        } else if (tmp_ === "global") {
                            tmp = (nonlocal_?.__call__?.bind(nonlocal_) ?? nonlocal_)(true);
                            (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                            return tmp;
                        } else if (tmp_ === "with") {
                            return (with_?.__call__?.bind(with_) ?? with_)();
                        } else {
                            (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                        }
                    }
                };
ρσ_anonfunc.__module__ = "parse";
undefined;
                return ρσ_anonfunc;
            })());

            function with_() {
                var clauses, start, expr, alias, body;
                clauses = [];
                start = S.token;
                while (true) {
                    if ((is_?.__call__?.bind(is_) ?? is_)("eof")) {
                        (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                    }
                    expr = (expression?.__call__?.bind(expression) ?? expression)();
                    alias = null;
                    if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "as")) {
                        (next?.__call__?.bind(next) ?? next)();
                        alias = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolAlias);
                    }
                    clauses.push(new AST_WithClause({"expression":expr,"alias":alias}));
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        (next?.__call__?.bind(next) ?? next)();
                        continue;
                    }
                    if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                        (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                    }
                    break;
                }
                if (!clauses.length) {
                    (token_error?.__call__?.bind(token_error) ?? token_error)(start, "with statement must have at least one clause");
                }
                body = (statement?.__call__?.bind(statement) ?? statement)();
                return new AST_With({"clauses":clauses,"body":body});
            };
with_.__module__ = "parse";
undefined;

            function simple_statement(tmp) {
                tmp = (expression?.__call__?.bind(expression) ?? expression)(true);
                (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                return new AST_SimpleStatement({"body":tmp});
            };
simple_statement.__argnames__ = ["tmp"];
simple_statement.__module__ = "parse";
undefined;

            function break_cont(t) {
                if (S.in_loop === 0) {
                    (croak?.__call__?.bind(croak) ?? croak)(ρσ_operator_add(t.name.slice(4), " not inside a loop or switch"));
                }
                (semicolon?.__call__?.bind(semicolon) ?? semicolon)();
                return (js_new?.__call__?.bind(js_new) ?? js_new)(t);
            };
break_cont.__argnames__ = ["t"];
break_cont.__module__ = "parse";
undefined;

            function yield_() {
                var is_yield_from;
                if (S.in_function === 0) {
                    (croak?.__call__?.bind(croak) ?? croak)("'yield' outside of function");
                }
                if ((ρσ_expr_temp = S.functions)[ρσ_expr_temp.length-1].is_generator === false) {
                    (croak?.__call__?.bind(croak) ?? croak)("'yield' not allowed in a function with return");
                }
                (ρσ_expr_temp = S.functions)[ρσ_expr_temp.length-1].is_generator = true;
                is_yield_from = (is_?.__call__?.bind(is_) ?? is_)("keyword", "from");
                if (is_yield_from) {
                    (next?.__call__?.bind(next) ?? next)();
                }
                return new AST_Yield({"is_yield_from":is_yield_from,"value":(return_?.__call__?.bind(return_) ?? return_)()});
            };
yield_.__module__ = "parse";
undefined;

            function for_(list_comp) {
                var init, tmp;
                init = null;
                if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ";")) {
                    init = (expression?.__call__?.bind(expression) ?? expression)(true, true);
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(init, AST_Seq)) {
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(init.car, AST_SymbolRef) && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(init.cdr, AST_SymbolRef)) {
                            tmp = init.to_array();
                        } else {
                            tmp = ρσ_list_decorate([ init ]);
                        }
                        init = new AST_Array({"start":init.start,"elements":tmp,"end":init.end});
                    }
                    if ((is_?.__call__?.bind(is_) ?? is_)("operator", "in")) {
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(init, AST_Var) && init.definitions.length > 1) {
                            (croak?.__call__?.bind(croak) ?? croak)("Only one variable declaration allowed in for..in loop");
                        }
                        (next?.__call__?.bind(next) ?? next)();
                        return (for_in?.__call__?.bind(for_in) ?? for_in)(init, list_comp);
                    }
                }
                (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
            };
for_.__argnames__ = ["list_comp"];
for_.__module__ = "parse";
undefined;

            function for_in(init, list_comp) {
                var lhs, obj;
                lhs = ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(init, AST_Var)) ? init.definitions[0].name : null;
                obj = (expression?.__call__?.bind(expression) ?? expression)(true);
                if (list_comp) {
                    return {"init":init,"name":lhs,"object":obj};
                }
                return new AST_ForIn({"init":init,"name":lhs,"object":obj,"body":(in_loop?.__call__?.bind(in_loop) ?? in_loop)(statement)});
            };
for_in.__argnames__ = ["init", "list_comp"];
for_in.__module__ = "parse";
undefined;

            function for_js() {
                var condition;
                condition = (as_atom_node?.__call__?.bind(as_atom_node) ?? as_atom_node)();
                return new AST_ForJS({"condition":condition,"body":(in_loop?.__call__?.bind(in_loop) ?? in_loop)(statement)});
            };
for_js.__module__ = "parse";
undefined;

            function get_class_in_scope(expr) {
                var s, referenced_path, class_name;
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_SymbolRef)) {
                    if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(NATIVE_CLASSES, expr.name)) {
                        return NATIVE_CLASSES[ρσ_bound_index(expr.name, NATIVE_CLASSES)];
                    }
                    if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(ERROR_CLASSES, expr.name)) {
                        return ERROR_CLASSES[ρσ_bound_index(expr.name, ERROR_CLASSES)];
                    }
                    for (var ρσ_Index53 = ρσ_operator_sub(S.classes.length, 1); ρσ_Index53 > -1; ρσ_Index53-=1) {
                        s = ρσ_Index53;
                        if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)((ρσ_expr_temp = S.classes)[(typeof s === "number" && s < 0) ? ρσ_expr_temp.length + s : s], expr.name)) {
                            return (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[(typeof s === "number" && s < 0) ? ρσ_expr_temp.length + s : s])[ρσ_bound_index(expr.name, ρσ_expr_temp)];
                        }
                    }
                } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_Dot)) {
                    referenced_path = ρσ_list_decorate([]);
                    while ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_Dot)) {
                        referenced_path.unshift(expr.property);
                        expr = expr.expression;
                    }
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_SymbolRef)) {
                        referenced_path.unshift(expr.name);
                        if ((len?.__call__?.bind(len) ?? len)(referenced_path) > 1) {
                            class_name = referenced_path.join(".");
                            for (var ρσ_Index54 = ρσ_operator_sub(S.classes.length, 1); ρσ_Index54 > -1; ρσ_Index54-=1) {
                                s = ρσ_Index54;
                                if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)((ρσ_expr_temp = S.classes)[(typeof s === "number" && s < 0) ? ρσ_expr_temp.length + s : s], class_name)) {
                                    return (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[(typeof s === "number" && s < 0) ? ρσ_expr_temp.length + s : s])[(typeof class_name === "number" && class_name < 0) ? ρσ_expr_temp.length + class_name : class_name];
                                }
                            }
                        }
                    }
                }
                return false;
            };
get_class_in_scope.__argnames__ = ["expr"];
get_class_in_scope.__module__ = "parse";
undefined;

            function import_error(message) {
                var ctx;
                ctx = S.input.context();
                throw new ImportError(message, ctx.filename, ctx.tokline, ctx.tokcol, ctx.tokpos);
            };
import_error.__argnames__ = ["message"];
import_error.__module__ = "parse";
undefined;

            function do_import(key) {
                var package_module_id, src_code, filename, modpath, ρσ_unpack, data, location, cached, srchash, ikey, bitem;
                if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(imported_modules, key)) {
                    return;
                }
                if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(importing_modules, key) && importing_modules[(typeof key === "number" && key < 0) ? importing_modules.length + key : key]) {
                    (import_error?.__call__?.bind(import_error) ?? import_error)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("Detected a recursive import of: ", key), " while importing: "), module_id));
                }
                package_module_id = key.split(".").slice(0, -1).join(".");
                if ((len?.__call__?.bind(len) ?? len)(package_module_id) > 0) {
                    (do_import?.__call__?.bind(do_import) ?? do_import)(package_module_id);
                }
                if (options.for_linting) {
                    imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key] = {"is_cached":true,"classes":Object.create(null),"module_id":key,"exports":ρσ_list_decorate([]),"nonlocalvars":ρσ_list_decorate([]),"baselib":Object.create(null),"outputs":Object.create(null),"discard_asserts":options.discard_asserts};
                    return;
                }
                function safe_read(base_path) {
                    var ρσ_unpack, i, path;
                    var ρσ_Iter55 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(ρσ_list_decorate([ ρσ_operator_add(base_path, ".py"), ρσ_operator_add(base_path, "/__init__.py") ]));
                    ρσ_Iter55 = ((typeof ρσ_Iter55[Symbol.iterator] === "function") ? (ρσ_Iter55 instanceof Map ? ρσ_Iter55.keys() : ρσ_Iter55) : Object.keys(ρσ_Iter55));
                    for (var ρσ_Index55 of ρσ_Iter55) {
                        ρσ_unpack = ρσ_Index55;
                        i = ρσ_unpack[0];
                        path = ρσ_unpack[1];
                        try {
                            return ρσ_list_decorate([ (readfile?.__call__?.bind(readfile) ?? readfile)(path, "utf-8"), path ]);
                        } catch (ρσ_Exception) {
                            ρσ_last_exception = ρσ_Exception;
                            {
                                if (i === 1) {
                                    return [null, null];
                                }
                            } 
                        }
                    }
                };
safe_read.__argnames__ = ["base_path"];
safe_read.__module__ = "parse";
undefined;

                src_code = filename = null;
                modpath = key.replace(/\./g, "/");
                var ρσ_Iter56 = import_dirs;
                ρσ_Iter56 = ((typeof ρσ_Iter56[Symbol.iterator] === "function") ? (ρσ_Iter56 instanceof Map ? ρσ_Iter56.keys() : ρσ_Iter56) : Object.keys(ρσ_Iter56));
                for (var ρσ_Index56 of ρσ_Iter56) {
                    location = ρσ_Index56;
                    if (location) {
                        ρσ_unpack = (safe_read?.__call__?.bind(safe_read) ?? safe_read)(ρσ_operator_add(ρσ_operator_add(location, "/"), modpath));
ρσ_unpack = ρσ_unpack_asarray(2, ρσ_unpack);
                        data = ρσ_unpack[0];
                        filename = ρσ_unpack[1];
                        if (data !== null) {
                            src_code = data;
                            break;
                        }
                    }
                }
                if (src_code === null) {
                    (import_error?.__call__?.bind(import_error) ?? import_error)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("Failed Import: '", key), "' module doesn't exist in any of the import directories: "), import_dirs.join(":")));
                }
                try {
                    cached = JSON.parse((readfile?.__call__?.bind(readfile) ?? readfile)((cache_file_name?.__call__?.bind(cache_file_name) ?? cache_file_name)(filename, options.module_cache_dir), "utf-8"));
                } catch (ρσ_Exception) {
                    ρσ_last_exception = ρσ_Exception;
                    {
                        cached = null;
                    } 
                }
                srchash = (sha1sum?.__call__?.bind(sha1sum) ?? sha1sum)(src_code);
                if (cached && cached.version === COMPILER_VERSION && cached.signature === srchash && cached.discard_asserts === !!options.discard_asserts) {
                    var ρσ_Iter57 = cached.imported_module_ids;
                    ρσ_Iter57 = ((typeof ρσ_Iter57[Symbol.iterator] === "function") ? (ρσ_Iter57 instanceof Map ? ρσ_Iter57.keys() : ρσ_Iter57) : Object.keys(ρσ_Iter57));
                    for (var ρσ_Index57 of ρσ_Iter57) {
                        ikey = ρσ_Index57;
                        (do_import?.__call__?.bind(do_import) ?? do_import)(ikey);
                    }
                    imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key] = {"is_cached":true,"classes":cached.classes,"outputs":cached.outputs,"module_id":key,"import_order":Object.keys(imported_modules).length,"nonlocalvars":cached.nonlocalvars,"baselib":cached.baselib,"exports":cached.exports,"discard_asserts":options.discard_asserts,"imported_module_ids":cached.imported_module_ids};
                } else {
                    (parse?.__call__?.bind(parse) ?? parse)(src_code, {"filename":filename,"toplevel":null,"basedir":options.basedir,"libdir":options.libdir,"import_dirs":options.import_dirs,"module_id":key,"imported_modules":imported_modules,"importing_modules":importing_modules,"discard_asserts":options.discard_asserts,"module_cache_dir":options.module_cache_dir});
                }
                imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key].srchash = srchash;
                var ρσ_Iter58 = Object.keys(imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key].baselib);
                ρσ_Iter58 = ((typeof ρσ_Iter58[Symbol.iterator] === "function") ? (ρσ_Iter58 instanceof Map ? ρσ_Iter58.keys() : ρσ_Iter58) : Object.keys(ρσ_Iter58));
                for (var ρσ_Index58 of ρσ_Iter58) {
                    bitem = ρσ_Index58;
                    baselib_items[(typeof bitem === "number" && bitem < 0) ? baselib_items.length + bitem : bitem] = true;
                }
            };
do_import.__argnames__ = ["key"];
do_import.__module__ = "parse";
undefined;

            function read_python_flags() {
                var bracketed, name, val;
                (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "import");
                bracketed = (is_?.__call__?.bind(is_) ?? is_)("punc", "(");
                if (bracketed) {
                    (next?.__call__?.bind(next) ?? next)();
                }
                while (true) {
                    if (!(is_?.__call__?.bind(is_) ?? is_)("name")) {
                        (croak?.__call__?.bind(croak) ?? croak)("Name expected");
                    }
                    name = S.token.value;
                    val = (name.startsWith("no_")) ? false : true;
                    if (!val) {
                        name = name.slice(3);
                    }
                    if (!PYTHON_FLAGS) {
                        (croak?.__call__?.bind(croak) ?? croak)(ρσ_operator_add("Unknown __python__ flag: ", name));
                    }
                    if (ρσ_equals(name, "exponent")) {
                        S.scoped_flags.set("exponent", val);
                        S.input.context()["exponent"] = val;
                    } else if (ρσ_equals(name, "ellipses")) {
                        S.scoped_flags.set("ellipses", val);
                    } else if (ρσ_equals(name, "annotations")) {
                        S.scoped_flags.set("annotations", val);
                    } else {
                        S.scoped_flags.set(name, val);
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        (next?.__call__?.bind(next) ?? next)();
                    } else {
                        if (bracketed) {
                            if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                                (next?.__call__?.bind(next) ?? next)();
                            } else {
                                continue;
                            }
                        }
                        break;
                    }
                }
                return new AST_EmptyStatement({"stype":"scoped_flags","start":(prev?.__call__?.bind(prev) ?? prev)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
            };
read_python_flags.__module__ = "parse";
undefined;

            function mock_typing_module() {
                var bracketed, name;
                (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "import");
                bracketed = (is_?.__call__?.bind(is_) ?? is_)("punc", "(");
                if (bracketed) {
                    (next?.__call__?.bind(next) ?? next)();
                }
                while (true) {
                    if (!(is_?.__call__?.bind(is_) ?? is_)("name")) {
                        (croak?.__call__?.bind(croak) ?? croak)("Name expected");
                    }
                    name = S.token.value;
                    (next?.__call__?.bind(next) ?? next)();
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        (next?.__call__?.bind(next) ?? next)();
                    } else {
                        if (bracketed) {
                            if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                                (next?.__call__?.bind(next) ?? next)();
                            } else {
                                continue;
                            }
                        }
                        break;
                    }
                }
                return new AST_EmptyStatement({"start":(prev?.__call__?.bind(prev) ?? prev)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
            };
mock_typing_module.__module__ = "parse";
undefined;

            function import_(from_import) {
                var ans, tok, tmp, name, last_tok, key, alias, aimp, ρσ_unpack, classes, argnames, bracketed, exports, symdef, aname, obj, argvar, cname, imp;
                ans = new AST_Imports({"imports":ρσ_list_decorate([])});
                while (true) {
                    tok = tmp = name = last_tok = (expression?.__call__?.bind(expression) ?? expression)(false);
                    key = "";
                    while ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(tmp, AST_Dot)) {
                        key = ρσ_operator_add(ρσ_operator_add(".", tmp.property), key);
                        tmp = last_tok = tmp.expression;
                    }
                    key = ρσ_operator_add(tmp.name, key);
                    if (from_import && key === "__python__") {
                        return (read_python_flags?.__call__?.bind(read_python_flags) ?? read_python_flags)();
                    }
                    if (from_import && key === "typing") {
                        return (mock_typing_module?.__call__?.bind(mock_typing_module) ?? mock_typing_module)();
                    }
                    alias = null;
                    if (!from_import && (is_?.__call__?.bind(is_) ?? is_)("keyword", "as")) {
                        (next?.__call__?.bind(next) ?? next)();
                        alias = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolAlias);
                    }
                    function body() {
                        return imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key];
                    };
body.__module__ = "parse";
undefined;

                    aimp = new AST_Import({"module":name,"key":key,"alias":alias,"argnames":null,"body":body});
                    ρσ_unpack = [tok.start, last_tok.end];
                    aimp.start = ρσ_unpack[0];
                    aimp.end = ρσ_unpack[1];
                    ans.imports.push(aimp);
                    if (from_import) {
                        break;
                    }
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        (next?.__call__?.bind(next) ?? next)();
                    } else {
                        break;
                    }
                }
                var ρσ_Iter59 = ans["imports"];
                ρσ_Iter59 = ((typeof ρσ_Iter59[Symbol.iterator] === "function") ? (ρσ_Iter59 instanceof Map ? ρσ_Iter59.keys() : ρσ_Iter59) : Object.keys(ρσ_Iter59));
                for (var ρσ_Index59 of ρσ_Iter59) {
                    imp = ρσ_Index59;
                    (do_import?.__call__?.bind(do_import) ?? do_import)(imp.key);
                    if (imported_module_ids.indexOf(imp.key) === -1) {
                        imported_module_ids.push(imp.key);
                    }
                    classes = imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key].classes;
                    if (from_import) {
                        (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "import");
                        imp.argnames = argnames = ρσ_list_decorate([]);
                        bracketed = (is_?.__call__?.bind(is_) ?? is_)("punc", "(");
                        if (bracketed) {
                            (next?.__call__?.bind(next) ?? next)();
                        }
                        exports = Object.create(null);
                        var ρσ_Iter60 = imported_modules[(typeof key === "number" && key < 0) ? imported_modules.length + key : key].exports;
                        ρσ_Iter60 = ((typeof ρσ_Iter60[Symbol.iterator] === "function") ? (ρσ_Iter60 instanceof Map ? ρσ_Iter60.keys() : ρσ_Iter60) : Object.keys(ρσ_Iter60));
                        for (var ρσ_Index60 of ρσ_Iter60) {
                            symdef = ρσ_Index60;
                            exports[ρσ_bound_index(symdef.name, exports)] = true;
                        }
                        while (true) {
                            aname = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_ImportedVar);
                            if (!options.for_linting && !(has_prop?.__call__?.bind(has_prop) ?? has_prop)(exports, aname.name)) {
                                (import_error?.__call__?.bind(import_error) ?? import_error)(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("The symbol \"", aname.name), "\" is not exported from the module: "), key));
                            }
                            if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "as")) {
                                (next?.__call__?.bind(next) ?? next)();
                                aname.alias = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolAlias);
                            }
                            argnames.push(aname);
                            if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                                (next?.__call__?.bind(next) ?? next)();
                            } else {
                                if (bracketed) {
                                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                                        (next?.__call__?.bind(next) ?? next)();
                                    } else {
                                        continue;
                                    }
                                }
                                break;
                            }
                        }
                        var ρσ_Iter61 = argnames;
                        ρσ_Iter61 = ((typeof ρσ_Iter61[Symbol.iterator] === "function") ? (ρσ_Iter61 instanceof Map ? ρσ_Iter61.keys() : ρσ_Iter61) : Object.keys(ρσ_Iter61));
                        for (var ρσ_Index61 of ρσ_Iter61) {
                            argvar = ρσ_Index61;
                            obj = classes[ρσ_bound_index(argvar.name, classes)];
                            if (obj) {
                                key = (argvar.alias) ? argvar.alias.name : argvar.name;
                                (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_expr_temp.length-1])[(typeof key === "number" && key < 0) ? ρσ_expr_temp.length + key : key] = {"static":obj.static,"bound":obj.bound,"classvars":obj.classvars};
                            }
                        }
                    } else {
                        var ρσ_Iter62 = Object.keys(classes);
                        ρσ_Iter62 = ((typeof ρσ_Iter62[Symbol.iterator] === "function") ? (ρσ_Iter62 instanceof Map ? ρσ_Iter62.keys() : ρσ_Iter62) : Object.keys(ρσ_Iter62));
                        for (var ρσ_Index62 of ρσ_Iter62) {
                            cname = ρσ_Index62;
                            obj = classes[(typeof cname === "number" && cname < 0) ? classes.length + cname : cname];
                            key = (imp.alias) ? imp.alias.name : imp.key;
                            (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_expr_temp.length-1])[ρσ_bound_index(ρσ_operator_add(ρσ_operator_add(key, "."), obj.name.name), ρσ_expr_temp)] = {"static":obj.static,"bound":obj.bound,"classvars":obj.classvars};
                        }
                    }
                }
                return ans;
            };
import_.__argnames__ = ["from_import"];
import_.__module__ = "parse";
undefined;

            function class_() {
                var name, externaldecorator, class_details, bases, class_parent, a, docstrings, definition, descriptor, stmt, class_var_names, visitor;
                name = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolDefun);
                if (!name) {
                    (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                }
                externaldecorator = (has_simple_decorator?.__call__?.bind(has_simple_decorator) ?? has_simple_decorator)(S.decorators, "external");
                class_details = {"static":Object.create(null),"bound":[],"classvars":Object.create(null),"processing":name.name,"provisional_classvars":Object.create(null)};
                bases = [];
                class_parent = null;
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", "(")) {
                    S.in_parenthesized_expr = true;
                    (next?.__call__?.bind(next) ?? next)();
                    while (true) {
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                            S.in_parenthesized_expr = false;
                            (next?.__call__?.bind(next) ?? next)();
                            break;
                        }
                        a = (expr_atom?.__call__?.bind(expr_atom) ?? expr_atom)(false);
                        if (class_parent === null) {
                            class_parent = a;
                        }
                        bases.push(a);
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                            (next?.__call__?.bind(next) ?? next)();
                            continue;
                        }
                    }
                }
                docstrings = [];
                function decorators() {
                    var d, decorator;
                    d = ρσ_list_decorate([]);
                    var ρσ_Iter63 = S.decorators;
                    ρσ_Iter63 = ((typeof ρσ_Iter63[Symbol.iterator] === "function") ? (ρσ_Iter63 instanceof Map ? ρσ_Iter63.keys() : ρσ_Iter63) : Object.keys(ρσ_Iter63));
                    for (var ρσ_Index63 of ρσ_Iter63) {
                        decorator = ρσ_Index63;
                        d.push(new AST_Decorator({"expression":decorator}));
                    }
                    S.decorators = [];
                    return d;
                };
decorators.__module__ = "parse";
undefined;

                function body(loop, labels) {
                    var a;
                    S.in_class.push(name.name);
                    (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_bound_index(ρσ_operator_sub(S.classes.length, 1), ρσ_expr_temp)])[ρσ_bound_index(name.name, ρσ_expr_temp)] = class_details;
                    S.classes.push(Object.create(null));
                    S.scoped_flags.push();
                    S.in_function = ρσ_operator_iadd(S.in_function, 1);
                    S.in_loop = 0;
                    S.labels = ρσ_list_decorate([]);
                    a = (block_?.__call__?.bind(block_) ?? block_)(docstrings);
                    S.in_function = ρσ_operator_isub(S.in_function, 1);
                    S.scoped_flags.pop();
                    S.classes.pop();
                    S.in_class.pop();
                    S.in_loop = loop;
                    S.labels = labels;
                    return a;
                };
body.__argnames__ = ["loop", "labels"];
body.__module__ = "parse";
undefined;

                definition = new AST_Class({"name":name,"docstrings":docstrings,"module_id":module_id,"dynamic_properties":Object.create(null),"parent":class_parent,"bases":bases,"localvars":ρσ_list_decorate([]),"classvars":class_details.classvars,"static":class_details.static,"external":externaldecorator,"bound":class_details.bound,"statements":ρσ_list_decorate([]),"decorators":(decorators?.__call__?.bind(decorators) ?? decorators)(),"body":(body?.__call__?.bind(body) ?? body)(S.in_loop, S.labels)});
                class_details.processing = false;
                var ρσ_Iter64 = definition.body;
                ρσ_Iter64 = ((typeof ρσ_Iter64[Symbol.iterator] === "function") ? (ρσ_Iter64 instanceof Map ? ρσ_Iter64.keys() : ρσ_Iter64) : Object.keys(ρσ_Iter64));
                for (var ρσ_Index64 of ρσ_Iter64) {
                    stmt = ρσ_Index64;
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Method)) {
                        if (stmt.is_getter || stmt.is_setter) {
                            descriptor = (ρσ_expr_temp = definition.dynamic_properties)[ρσ_bound_index(stmt.name.name, ρσ_expr_temp)];
                            if (!descriptor) {
                                descriptor = (ρσ_expr_temp = definition.dynamic_properties)[ρσ_bound_index(stmt.name.name, ρσ_expr_temp)] = Object.create(null);
                            }
                            descriptor[ρσ_bound_index((stmt.is_getter) ? "getter" : "setter", descriptor)] = stmt;
                        } else if (stmt.name.name === "__init__") {
                            definition.init = stmt;
                        }
                    }
                }
                class_var_names = Object.create(null);
                function walker() {
                    function visit_node(node, descend) {
                        var varname;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Method)) {
                            class_var_names[ρσ_bound_index(node.name.name, class_var_names)] = true;
                            return;
                        }
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Function)) {
                            return;
                        }
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Assign) && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node.left, AST_SymbolRef)) {
                            varname = node.left.name;
                            if (FORBIDDEN_CLASS_VARS.indexOf(varname) !== -1) {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(node.left.start, ρσ_operator_add(varname, " is not allowed as a class variable name"));
                            }
                            class_var_names[(typeof varname === "number" && varname < 0) ? class_var_names.length + varname : varname] = true;
                            (ρσ_expr_temp = definition.classvars)[(typeof varname === "number" && varname < 0) ? ρσ_expr_temp.length + varname : varname] = true;
                        } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_SymbolRef) && (has_prop?.__call__?.bind(has_prop) ?? has_prop)(class_var_names, node.name)) {
                            node.thedef = new AST_SymbolDefun({"name":ρσ_operator_add(ρσ_operator_add(name.name, ".prototype."), node.name)});
                        }
                        if (descend) {
                            descend.call(node);
                        }
                    };
visit_node.__argnames__ = ["node", "descend"];
visit_node.__module__ = "parse";
undefined;

                    this._visit = visit_node;
                };
walker.__module__ = "parse";
undefined;

                visitor = (js_new?.__call__?.bind(js_new) ?? js_new)(walker);
                var ρσ_Iter65 = definition.body;
                ρσ_Iter65 = ((typeof ρσ_Iter65[Symbol.iterator] === "function") ? (ρσ_Iter65 instanceof Map ? ρσ_Iter65.keys() : ρσ_Iter65) : Object.keys(ρσ_Iter65));
                for (var ρσ_Index65 of ρσ_Iter65) {
                    stmt = ρσ_Index65;
                    if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Class)) {
                        stmt.walk(visitor);
                        definition.statements.push(stmt);
                    }
                }
                return definition;
            };
class_.__module__ = "parse";
undefined;

            function function_(in_class, is_expression, is_lambda) {
                var is_anonymous, name, staticmethod, property_getter, property_setter, staticloc, ctor, return_annotation, is_generator, docstrings, args, definition, assignments, j, i, nonlocals;
                if (is_lambda) {
                    if (in_class || !is_expression) {
                        (croak?.__call__?.bind(croak) ?? croak)("Compiler bug -- lambda must be an expression and not in a class");
                    }
                    is_anonymous = true;
                    name = null;
                } else {
                    name = ((is_?.__call__?.bind(is_) ?? is_)("name")) ? (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)((in_class) ? AST_SymbolDefun : AST_SymbolLambda) : null;
                    if (in_class && !name) {
                        (croak?.__call__?.bind(croak) ?? croak)("Cannot use anonymous function as class methods");
                    }
                    is_anonymous = !name;
                }
                staticmethod = property_getter = property_setter = false;
                if (in_class) {
                    staticloc = (has_simple_decorator?.__call__?.bind(has_simple_decorator) ?? has_simple_decorator)(S.decorators, "staticmethod");
                    property_getter = (has_simple_decorator?.__call__?.bind(has_simple_decorator) ?? has_simple_decorator)(S.decorators, "property");
                    property_setter = (has_setter_decorator?.__call__?.bind(has_setter_decorator) ?? has_setter_decorator)(S.decorators, name.name);
                    if (staticloc) {
                        if (property_getter || property_setter) {
                            (croak?.__call__?.bind(croak) ?? croak)("A method cannot be both static and a property getter/setter");
                        }
                        (ρσ_expr_temp = (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_bound_index(ρσ_operator_sub(S.classes.length, 2), ρσ_expr_temp)])[(typeof in_class === "number" && in_class < 0) ? ρσ_expr_temp.length + in_class : in_class].static)[ρσ_bound_index(name.name, ρσ_expr_temp)] = true;
                        staticmethod = true;
                    } else if (name.name !== "__init__" && S.scoped_flags.get("bound_methods")) {
                        (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_bound_index(ρσ_operator_sub(S.classes.length, 2), ρσ_expr_temp)])[(typeof in_class === "number" && in_class < 0) ? ρσ_expr_temp.length + in_class : in_class].bound.push(name.name);
                    }
                }
                if (!is_lambda) {
                    (expect?.__call__?.bind(expect) ?? expect)("(");
                    S.in_parenthesized_expr = true;
                }
                ctor = (in_class) ? AST_Method : AST_Function;
                return_annotation = null;
                is_generator = [];
                docstrings = [];
                function argnames() {
                    var a, defaults, first, seen_names, def_line, current_arg_name, name_token, end_punctuation;
                    a = [];
                    defaults = Object.create(null);
                    first = true;
                    seen_names = Object.create(null);
                    def_line = S.input.context().tokline;
                    current_arg_name = null;
                    name_token = null;
                    function get_arg() {
                        var name_ctx, ntok, annotation, sym;
                        current_arg_name = S.token.value;
                        if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(seen_names, current_arg_name)) {
                            (token_error?.__call__?.bind(token_error) ?? token_error)((prev?.__call__?.bind(prev) ?? prev)(), "Can't repeat parameter names");
                        }
                        if (current_arg_name === "arguments") {
                            (token_error?.__call__?.bind(token_error) ?? token_error)((prev?.__call__?.bind(prev) ?? prev)(), "Can't use the name arguments as a parameter name, it is reserved by JavaScript");
                        }
                        seen_names[(typeof current_arg_name === "number" && current_arg_name < 0) ? seen_names.length + current_arg_name : current_arg_name] = true;
                        name_token = S.token;
                        name_ctx = S.input.context();
                        ntok = (peek?.__call__?.bind(peek) ?? peek)();
                        if (ntok.type === "punc" && ntok.value === ":" && !is_lambda) {
                            (next?.__call__?.bind(next) ?? next)();
                            (expect?.__call__?.bind(expect) ?? expect)(":");
                            annotation = (maybe_conditional?.__call__?.bind(maybe_conditional) ?? maybe_conditional)();
                            if (!(is_token?.__call__?.bind(is_token) ?? is_token)(name_token, "name")) {
                                (croak?.__call__?.bind(croak) ?? croak)("Name expected", name_ctx.tokline);
                                return null;
                            }
                            sym = new AST_SymbolFunarg({"name":name_token.value,"start":S.token,"end":S.token,"annotation":annotation});
                            return sym;
                        } else {
                            if (!(is_?.__call__?.bind(is_) ?? is_)("name")) {
                                if (S.input.context().tokline !== def_line) {
                                    (croak?.__call__?.bind(croak) ?? croak)("Name expected", def_line);
                                } else {
                                    (croak?.__call__?.bind(croak) ?? croak)("Name expected");
                                }
                                return null;
                            }
                            sym = new AST_SymbolFunarg({"name":current_arg_name,"start":S.token,"end":S.token,"annotation":null});
                            (next?.__call__?.bind(next) ?? next)();
                            return sym;
                        }
                    };
get_arg.__module__ = "parse";
undefined;

                    end_punctuation = (is_lambda) ? ":" : ")";
                    while (!(is_?.__call__?.bind(is_) ?? is_)("punc", end_punctuation)) {
                        if (first) {
                            first = false;
                        } else {
                            (expect?.__call__?.bind(expect) ?? expect)(",");
                            if ((is_?.__call__?.bind(is_) ?? is_)("punc", end_punctuation)) {
                                break;
                            }
                        }
                        if ((is_?.__call__?.bind(is_) ?? is_)("operator", "**")) {
                            (next?.__call__?.bind(next) ?? next)();
                            if (a.kwargs) {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define multiple **kwargs in function definition");
                            }
                            a.kwargs = (get_arg?.__call__?.bind(get_arg) ?? get_arg)();
                        } else if ((is_?.__call__?.bind(is_) ?? is_)("operator", "*")) {
                            (next?.__call__?.bind(next) ?? next)();
                            if (a.starargs) {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define multiple *args in function definition");
                            }
                            if (a.kwargs) {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define *args after **kwargs in function definition");
                            }
                            a.starargs = (get_arg?.__call__?.bind(get_arg) ?? get_arg)();
                        } else {
                            if (a.starargs || a.kwargs) {
                                (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define a formal parameter after *args or **kwargs");
                            }
                            a.push((get_arg?.__call__?.bind(get_arg) ?? get_arg)());
                            if ((is_?.__call__?.bind(is_) ?? is_)("operator", "=")) {
                                if (a.kwargs) {
                                    (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define an optional formal parameter after **kwargs");
                                }
                                (next?.__call__?.bind(next) ?? next)();
                                defaults[(typeof current_arg_name === "number" && current_arg_name < 0) ? defaults.length + current_arg_name : current_arg_name] = (expression?.__call__?.bind(expression) ?? expression)(false);
                                a.has_defaults = true;
                            } else {
                                if (a.has_defaults) {
                                    (token_error?.__call__?.bind(token_error) ?? token_error)(name_token, "Can't define required formal parameters after optional formal parameters");
                                }
                            }
                        }
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    if (!is_lambda && (is_?.__call__?.bind(is_) ?? is_)("punc", "->")) {
                        (next?.__call__?.bind(next) ?? next)();
                        return_annotation = (maybe_conditional?.__call__?.bind(maybe_conditional) ?? maybe_conditional)();
                    }
                    if (!is_lambda) {
                        S.in_parenthesized_expr = false;
                    }
                    a.defaults = defaults;
                    a.is_simple_func = !a.starargs && !a.kwargs && !a.has_defaults;
                    return a;
                };
argnames.__module__ = "parse";
undefined;

                function decorators() {
                    var d, decorator;
                    d = [];
                    var ρσ_Iter66 = S.decorators;
                    ρσ_Iter66 = ((typeof ρσ_Iter66[Symbol.iterator] === "function") ? (ρσ_Iter66 instanceof Map ? ρσ_Iter66.keys() : ρσ_Iter66) : Object.keys(ρσ_Iter66));
                    for (var ρσ_Index66 of ρσ_Iter66) {
                        decorator = ρσ_Index66;
                        d.push(new AST_Decorator({"expression":decorator}));
                    }
                    S.decorators = [];
                    return d;
                };
decorators.__module__ = "parse";
undefined;

                function body(loop, labels) {
                    var a;
                    S.in_class.push(false);
                    S.classes.push(Object.create(null));
                    S.scoped_flags.push();
                    S.in_function = ρσ_operator_iadd(S.in_function, 1);
                    S.functions.push(Object.create(null));
                    S.in_loop = 0;
                    S.labels = ρσ_list_decorate([]);
                    if (is_lambda) {
                        a = (expression?.__call__?.bind(expression) ?? expression)(false, true);
                    } else {
                        a = (block_?.__call__?.bind(block_) ?? block_)(docstrings);
                    }
                    S.in_function = ρσ_operator_isub(S.in_function, 1);
                    S.scoped_flags.pop();
                    is_generator.push((bool?.__call__?.bind(bool) ?? bool)(S.functions.pop().is_generator));
                    S.classes.pop();
                    S.in_class.pop();
                    S.in_loop = loop;
                    S.labels = labels;
                    return a;
                };
body.__argnames__ = ["loop", "labels"];
body.__module__ = "parse";
undefined;

                args = {"name":name,"is_lambda":is_lambda,"is_expression":is_expression,"is_anonymous":is_anonymous,"annotations":S.scoped_flags.get("annotations"),"argnames":(argnames?.__call__?.bind(argnames) ?? argnames)(),"localvars":ρσ_list_decorate([]),"decorators":(decorators?.__call__?.bind(decorators) ?? decorators)(),"docstrings":docstrings,"body":(body?.__call__?.bind(body) ?? body)(S.in_loop, S.labels)};
                definition = (js_new?.__call__?.bind(js_new) ?? js_new)(ctor, args);
                definition.return_annotation = return_annotation;
                definition.is_generator = is_generator[0];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(definition, AST_Method)) {
                    definition.static = staticmethod;
                    definition.is_getter = property_getter;
                    definition.is_setter = property_setter;
                    if (definition.argnames.length < 1 && !definition.static) {
                        (croak?.__call__?.bind(croak) ?? croak)("Methods of a class must have at least one argument, traditionally named self");
                    }
                    if (definition.name && definition.name.name === "__init__") {
                        if (definition.is_generator) {
                            (croak?.__call__?.bind(croak) ?? croak)("The __init__ method of a class cannot be a generator (yield not allowed)");
                        }
                        if (property_getter || property_setter) {
                            (croak?.__call__?.bind(croak) ?? croak)("The __init__ method of a class cannot be a property getter/setter");
                        }
                    }
                }
                if (definition.is_generator) {
                    baselib_items["yield"] = true;
                }
                assignments = (scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(definition.body);
                for (var ρσ_Index67 = 0; ρσ_Index67 < assignments.length; ρσ_Index67++) {
                    i = ρσ_Index67;
                    for (var ρσ_Index68 = 0; ρσ_Index68 < ρσ_operator_add(definition.argnames.length, 1); ρσ_Index68++) {
                        j = ρσ_Index68;
                        if (j === definition.argnames.length) {
                            definition.localvars.push((new_symbol?.__call__?.bind(new_symbol) ?? new_symbol)(AST_SymbolVar, assignments[(typeof i === "number" && i < 0) ? assignments.length + i : i]));
                        } else if (j < definition.argnames.length && assignments[(typeof i === "number" && i < 0) ? assignments.length + i : i] === (ρσ_expr_temp = definition.argnames)[(typeof j === "number" && j < 0) ? ρσ_expr_temp.length + j : j].name) {
                            break;
                        }
                    }
                }
                nonlocals = (scan_for_nonlocal_defs?.__call__?.bind(scan_for_nonlocal_defs) ?? scan_for_nonlocal_defs)(definition.body);
                nonlocals = (function() {
                    var ρσ_Iter = nonlocals, ρσ_Result = ρσ_set(), name;
                    ρσ_Iter = ((typeof ρσ_Iter[Symbol.iterator] === "function") ? (ρσ_Iter instanceof Map ? ρσ_Iter.keys() : ρσ_Iter) : Object.keys(ρσ_Iter));
                    for (var ρσ_Index of ρσ_Iter) {
                        name = ρσ_Index;
                        ρσ_Result.add(name);
                    }
                    return ρσ_Result;
                })();
                function does_not_have(v) {
                    return !nonlocals.has(v.name);
                };
does_not_have.__argnames__ = ["v"];
does_not_have.__module__ = "parse";
undefined;

                definition.localvars = definition.localvars.filter(does_not_have);
                return definition;
            };
function_.__argnames__ = ["in_class", "is_expression", "is_lambda"];
function_.__module__ = "parse";
undefined;

            function if_() {
                var cond, body, belse;
                cond = (expression?.__call__?.bind(expression) ?? expression)(true);
                body = (statement?.__call__?.bind(statement) ?? statement)();
                belse = null;
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "elif") || (is_?.__call__?.bind(is_) ?? is_)("keyword", "else")) {
                    if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "else")) {
                        (next?.__call__?.bind(next) ?? next)();
                    } else {
                        S.token.value = "if";
                    }
                    belse = (statement?.__call__?.bind(statement) ?? statement)();
                }
                return new AST_If({"condition":cond,"body":body,"alternative":belse});
            };
if_.__module__ = "parse";
undefined;

            function is_docstring(stmt) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_SimpleStatement)) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt.body, AST_String)) {
                        return stmt.body;
                    }
                }
                return false;
            };
is_docstring.__argnames__ = ["stmt"];
is_docstring.__module__ = "parse";
undefined;

            function block_(docstrings) {
                var prev_whitespace, a, stmt, ds, current_whitespace;
                prev_whitespace = S.token.leading_whitespace;
                (expect?.__call__?.bind(expect) ?? expect)(":");
                a = [];
                if (!S.token.nlb) {
                    while (!S.token.nlb) {
                        if ((is_?.__call__?.bind(is_) ?? is_)("eof")) {
                            (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                        }
                        stmt = (statement?.__call__?.bind(statement) ?? statement)();
                        if (docstrings) {
                            ds = (is_docstring?.__call__?.bind(is_docstring) ?? is_docstring)(stmt);
                            if (ds) {
                                docstrings.push(ds);
                                continue;
                            }
                        }
                        a.push(stmt);
                    }
                } else {
                    current_whitespace = S.token.leading_whitespace;
                    if (current_whitespace.length === 0 || prev_whitespace === current_whitespace) {
                        (croak?.__call__?.bind(croak) ?? croak)("Expected an indented block");
                    }
                    while (!(is_?.__call__?.bind(is_) ?? is_)("punc", "}")) {
                        if ((is_?.__call__?.bind(is_) ?? is_)("eof")) {
                            return a;
                        }
                        stmt = (statement?.__call__?.bind(statement) ?? statement)();
                        if (docstrings) {
                            ds = (is_docstring?.__call__?.bind(is_docstring) ?? is_docstring)(stmt);
                            if (ds) {
                                docstrings.push(ds);
                                continue;
                            }
                        }
                        a.push(stmt);
                    }
                    (next?.__call__?.bind(next) ?? next)();
                }
                return a;
            };
block_.__argnames__ = ["docstrings"];
block_.__module__ = "parse";
undefined;

            function try_() {
                var body, bcatch, bfinally, belse, start, exceptions, name;
                body = (block_?.__call__?.bind(block_) ?? block_)();
                bcatch = [];
                bfinally = null;
                belse = null;
                while ((is_?.__call__?.bind(is_) ?? is_)("keyword", "except")) {
                    start = S.token;
                    (next?.__call__?.bind(next) ?? next)();
                    exceptions = ρσ_list_decorate([]);
                    if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ":") && !(is_?.__call__?.bind(is_) ?? is_)("keyword", "as")) {
                        exceptions.push((as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolVar));
                        while ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                            (next?.__call__?.bind(next) ?? next)();
                            exceptions.push((as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolVar));
                        }
                    }
                    name = null;
                    if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "as")) {
                        (next?.__call__?.bind(next) ?? next)();
                        name = (as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolCatch);
                    }
                    bcatch.push(new AST_Except({"start":start,"argname":name,"errors":exceptions,"body":(block_?.__call__?.bind(block_) ?? block_)(),"end":(prev?.__call__?.bind(prev) ?? prev)()}));
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "else")) {
                    start = S.token;
                    (next?.__call__?.bind(next) ?? next)();
                    belse = new AST_Else({"start":start,"body":(block_?.__call__?.bind(block_) ?? block_)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "finally")) {
                    start = S.token;
                    (next?.__call__?.bind(next) ?? next)();
                    bfinally = new AST_Finally({"start":start,"body":(block_?.__call__?.bind(block_) ?? block_)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                }
                if (!bcatch.length && !bfinally) {
                    (croak?.__call__?.bind(croak) ?? croak)("Missing except/finally blocks");
                }
                return new AST_Try({"body":body,"bcatch":(bcatch.length) ? new AST_Catch({"body":bcatch}) : null,"bfinally":bfinally,"belse":belse});
            };
try_.__module__ = "parse";
undefined;

            function vardefs(symbol_class) {
                var a;
                a = ρσ_list_decorate([]);
                while (true) {
                    a.push(new AST_VarDef({"start":S.token,"name":(as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(symbol_class),"value":((is_?.__call__?.bind(is_) ?? is_)("operator", "=")) ? ((next?.__call__?.bind(next) ?? next)(), 
                    (expression?.__call__?.bind(expression) ?? expression)(false)) : null,"end":(prev?.__call__?.bind(prev) ?? prev)()}));
                    if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        break;
                    }
                    (next?.__call__?.bind(next) ?? next)();
                }
                return a;
            };
vardefs.__argnames__ = ["symbol_class"];
vardefs.__module__ = "parse";
undefined;

            function nonlocal_(is_global) {
                var defs, vardef;
                defs = (vardefs?.__call__?.bind(vardefs) ?? vardefs)(AST_SymbolNonlocal);
                if (is_global) {
                    var ρσ_Iter69 = defs;
                    ρσ_Iter69 = ((typeof ρσ_Iter69[Symbol.iterator] === "function") ? (ρσ_Iter69 instanceof Map ? ρσ_Iter69.keys() : ρσ_Iter69) : Object.keys(ρσ_Iter69));
                    for (var ρσ_Index69 of ρσ_Iter69) {
                        vardef = ρσ_Index69;
                        S.globals.push(vardef.name.name);
                    }
                }
                return new AST_Var({"start":(prev?.__call__?.bind(prev) ?? prev)(),"definitions":defs,"end":(prev?.__call__?.bind(prev) ?? prev)()});
            };
nonlocal_.__argnames__ = ["is_global"];
nonlocal_.__module__ = "parse";
undefined;

            function new_() {
                var start, newexp, args;
                start = S.token;
                (expect_token?.__call__?.bind(expect_token) ?? expect_token)("operator", "new");
                newexp = (expr_atom?.__call__?.bind(expr_atom) ?? expr_atom)(false);
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", "(")) {
                    S.in_parenthesized_expr = true;
                    (next?.__call__?.bind(next) ?? next)();
                    args = (func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)();
                    S.in_parenthesized_expr = false;
                } else {
                    args = (func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)(true);
                }
                return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_New({"start":start,"expression":newexp,"args":args,"end":(prev?.__call__?.bind(prev) ?? prev)()}), true);
            };
new_.__module__ = "parse";
undefined;

            function string_() {
                var strings, start;
                strings = [];
                start = S.token;
                while (true) {
                    strings.push(S.token.value);
                    if ((peek?.__call__?.bind(peek) ?? peek)().type !== "string") {
                        break;
                    }
                    (next?.__call__?.bind(next) ?? next)();
                }
                return new AST_String({"start":start,"end":S.token,"value":strings.join("")});
            };
string_.__module__ = "parse";
undefined;

            function token_as_atom_node() {
                var tok, tmp_, tmp__;
                tok = S.token;
                tmp_ = tok.type;
                if (tmp_ === "name") {
                    return (token_as_symbol?.__call__?.bind(token_as_symbol) ?? token_as_symbol)(tok, AST_SymbolRef);
                } else if (tmp_ === "num") {
                    return new AST_Number({"start":tok,"end":tok,"value":tok.value});
                } else if (tmp_ === "string") {
                    return (string_?.__call__?.bind(string_) ?? string_)();
                } else if (tmp_ === "regexp") {
                    return new AST_RegExp({"start":tok,"end":tok,"value":tok.value});
                } else if (tmp_ === "atom") {
                    tmp__ = tok.value;
                    if (tmp__ === "False") {
                        return new AST_False({"start":tok,"end":tok});
                    } else if (tmp__ === "True") {
                        return new AST_True({"start":tok,"end":tok});
                    } else if (tmp__ === "None") {
                        return new AST_Null({"start":tok,"end":tok});
                    }
                } else if (tmp_ === "js") {
                    return new AST_Verbatim({"start":tok,"end":tok,"value":tok.value});
                }
                (token_error?.__call__?.bind(token_error) ?? token_error)(tok, "Expecting an atomic token (number/string/bool/regexp/js/None)");
            };
token_as_atom_node.__module__ = "parse";
undefined;

            function as_atom_node() {
                var ret;
                ret = (token_as_atom_node?.__call__?.bind(token_as_atom_node) ?? token_as_atom_node)();
                (next?.__call__?.bind(next) ?? next)();
                return ret;
            };
as_atom_node.__module__ = "parse";
undefined;

            function expr_atom(allow_calls) {
                var start, tmp_, ex, ret, cls, func;
                if ((is_?.__call__?.bind(is_) ?? is_)("operator", "new")) {
                    return (new_?.__call__?.bind(new_) ?? new_)();
                }
                start = S.token;
                if ((is_?.__call__?.bind(is_) ?? is_)("punc")) {
                    tmp_ = start.value;
                    if (tmp_ === "(") {
                        S.in_parenthesized_expr = true;
                        (next?.__call__?.bind(next) ?? next)();
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                            (next?.__call__?.bind(next) ?? next)();
                            return new AST_Array({"elements":ρσ_list_decorate([])});
                        }
                        ex = (expression?.__call__?.bind(expression) ?? expression)(true);
                        if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "for")) {
                            ret = (read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_GeneratorComprehension({"statement":ex}), ")");
                            S.in_parenthesized_expr = false;
                            return ret;
                        }
                        ex.start = start;
                        ex.end = S.token;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(ex, AST_SymbolRef)) {
                            ex.parens = true;
                        }
                        if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(ex, AST_GeneratorComprehension)) {
                            (expect?.__call__?.bind(expect) ?? expect)(")");
                        }
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(ex, AST_UnaryPrefix)) {
                            ex.parenthesized = true;
                        }
                        S.in_parenthesized_expr = false;
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(ex, allow_calls);
                    } else if (tmp_ === "[") {
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)((array_?.__call__?.bind(array_) ?? array_)(), allow_calls);
                    } else if (tmp_ === "{") {
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)((object_?.__call__?.bind(object_) ?? object_)(), allow_calls);
                    }
                    (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "class")) {
                    (next?.__call__?.bind(next) ?? next)();
                    cls = (class_?.__call__?.bind(class_) ?? class_)();
                    cls.start = start;
                    cls.end = (prev?.__call__?.bind(prev) ?? prev)();
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(cls, allow_calls);
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "def")) {
                    (next?.__call__?.bind(next) ?? next)();
                    func = (function_?.__call__?.bind(function_) ?? function_)(false, true, false);
                    func.start = start;
                    func.end = (prev?.__call__?.bind(prev) ?? prev)();
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(func, allow_calls);
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "lambda")) {
                    (next?.__call__?.bind(next) ?? next)();
                    func = (function_?.__call__?.bind(function_) ?? function_)(false, true, true);
                    func.start = start;
                    func.end = (prev?.__call__?.bind(prev) ?? prev)();
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(func, allow_calls);
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "yield")) {
                    (next?.__call__?.bind(next) ?? next)();
                    return (yield_?.__call__?.bind(yield_) ?? yield_)();
                }
                if (ATOMIC_START_TOKEN[ρσ_bound_index(S.token.type, ATOMIC_START_TOKEN)]) {
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)((as_atom_node?.__call__?.bind(as_atom_node) ?? as_atom_node)(), allow_calls);
                }
                (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
            };
expr_atom.__argnames__ = ["allow_calls"];
expr_atom.__module__ = "parse";
undefined;

            function expr_list(closing, allow_trailing_comma, allow_empty, func_call) {
                var first, a, saw_starargs, tmp, arg;
                first = true;
                a = ρσ_list_decorate([]);
                saw_starargs = false;
                while (!(is_?.__call__?.bind(is_) ?? is_)("punc", closing)) {
                    if (saw_starargs) {
                        (token_error?.__call__?.bind(token_error) ?? token_error)((prev?.__call__?.bind(prev) ?? prev)(), "*args must be the last argument in a function call");
                    }
                    if (first) {
                        first = false;
                    } else {
                        (expect?.__call__?.bind(expect) ?? expect)(",");
                    }
                    if (allow_trailing_comma && (is_?.__call__?.bind(is_) ?? is_)("punc", closing)) {
                        break;
                    }
                    if ((is_?.__call__?.bind(is_) ?? is_)("operator", "*") && func_call) {
                        saw_starargs = true;
                        (next?.__call__?.bind(next) ?? next)();
                    }
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ",") && allow_empty) {
                        a.push(new AST_Hole({"start":S.token,"end":S.token}));
                    } else {
                        a.push((expression?.__call__?.bind(expression) ?? expression)(false));
                    }
                }
                if (func_call) {
                    tmp = ρσ_list_decorate([]);
                    tmp.kwargs = ρσ_list_decorate([]);
                    var ρσ_Iter70 = a;
                    ρσ_Iter70 = ((typeof ρσ_Iter70[Symbol.iterator] === "function") ? (ρσ_Iter70 instanceof Map ? ρσ_Iter70.keys() : ρσ_Iter70) : Object.keys(ρσ_Iter70));
                    for (var ρσ_Index70 of ρσ_Iter70) {
                        arg = ρσ_Index70;
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(arg, AST_Assign)) {
                            tmp.kwargs.push(ρσ_list_decorate([ arg.left, arg.right ]));
                        } else {
                            tmp.push(arg);
                        }
                    }
                    a = tmp;
                }
                (next?.__call__?.bind(next) ?? next)();
                if (saw_starargs) {
                    a.starargs = true;
                }
                return a;
            };
expr_list.__argnames__ = ["closing", "allow_trailing_comma", "allow_empty", "func_call"];
expr_list.__module__ = "parse";
undefined;

            function func_call_list(empty) {
                var a, first, single_comprehension, arg;
                a = [];
                first = true;
                a.kwargs = [];
                a.kwarg_items = [];
                a.starargs = false;
                if (empty) {
                    return a;
                }
                single_comprehension = false;
                while (!(is_?.__call__?.bind(is_) ?? is_)("punc", ")") && !(is_?.__call__?.bind(is_) ?? is_)("eof")) {
                    if (!first) {
                        (expect?.__call__?.bind(expect) ?? expect)(",");
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", ")")) {
                            break;
                        }
                    }
                    if ((is_?.__call__?.bind(is_) ?? is_)("operator", "*")) {
                        (next?.__call__?.bind(next) ?? next)();
                        arg = (expression?.__call__?.bind(expression) ?? expression)(false);
                        arg.is_array = true;
                        a.push(arg);
                        a.starargs = true;
                    } else if ((is_?.__call__?.bind(is_) ?? is_)("operator", "**")) {
                        (next?.__call__?.bind(next) ?? next)();
                        a.kwarg_items.push((as_symbol?.__call__?.bind(as_symbol) ?? as_symbol)(AST_SymbolRef, false));
                        a.starargs = true;
                    } else {
                        arg = (expression?.__call__?.bind(expression) ?? expression)(false);
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(arg, AST_Assign)) {
                            a.kwargs.push(ρσ_list_decorate([ arg.left, arg.right ]));
                        } else {
                            if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "for")) {
                                if (!first) {
                                    (croak?.__call__?.bind(croak) ?? croak)("Generator expression must be parenthesized if not sole argument");
                                }
                                a.push((read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_GeneratorComprehension({"statement":arg}), ")"));
                                single_comprehension = true;
                                break;
                            }
                            a.push(arg);
                        }
                    }
                    first = false;
                }
                if (!single_comprehension) {
                    (next?.__call__?.bind(next) ?? next)();
                }
                return a;
            };
func_call_list.__argnames__ = ["empty"];
func_call_list.__module__ = "parse";
undefined;

            
            var array_ = embed_tokens((function() {
                var ρσ_anonfunc = function array_() {
                    var expr;
                    (expect?.__call__?.bind(expect) ?? expect)("[");
                    expr = ρσ_list_decorate([]);
                    if (!(is_?.__call__?.bind(is_) ?? is_)("punc", "]")) {
                        expr.push((expression?.__call__?.bind(expression) ?? expression)(false));
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", "..")) {
                            if (!S.scoped_flags.get("ellipses")) {
                                (croak?.__call__?.bind(croak) ?? croak)("Use 'from __python__ import ellipses' to support the [a..b] syntax");
                            }
                            return (read_ellipses_range?.__call__?.bind(read_ellipses_range) ?? read_ellipses_range)(new AST_EllipsesRange({"first":expr[0]}), "]");
                        }
                        if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "for")) {
                            return (read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_ListComprehension({"statement":expr[0]}), "]");
                        }
                        if (!(is_?.__call__?.bind(is_) ?? is_)("punc", "]")) {
                            (expect?.__call__?.bind(expect) ?? expect)(",");
                        }
                    }
                    return new AST_Array({"elements":expr.concat((expr_list?.__call__?.bind(expr_list) ?? expr_list)("]", true, true))});
                };
ρσ_anonfunc.__module__ = "parse";
undefined;
                return ρσ_anonfunc;
            })());

            
            var object_ = embed_tokens((function() {
                var ρσ_anonfunc = function object_() {
                    var first, has_non_const_keys, is_pydict, is_jshash, a, start, ctx, orig, left, end, args;
                    (expect?.__call__?.bind(expect) ?? expect)("{");
                    first = true;
                    has_non_const_keys = false;
                    is_pydict = S.scoped_flags.get("dict_literals", false);
                    is_jshash = S.scoped_flags.get("hash_literals", false);
                    a = ρσ_list_decorate([]);
                    while (!(is_?.__call__?.bind(is_) ?? is_)("punc", "}")) {
                        if (!first) {
                            (expect?.__call__?.bind(expect) ?? expect)(",");
                        }
                        if ((is_?.__call__?.bind(is_) ?? is_)("punc", "}")) {
                            break;
                        }
                        first = false;
                        start = S.token;
                        ctx = S.input.context();
                        orig = ctx.expecting_object_literal_key;
                        ctx.expecting_object_literal_key = true;
                        try {
                            left = (expression?.__call__?.bind(expression) ?? expression)(false);
                        } finally {
                            ctx.expecting_object_literal_key = orig;
                        }
                        if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "for")) {
                            return (read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_SetComprehension({"statement":left}), "}");
                        }
                        if (a.length === 0 && ((is_?.__call__?.bind(is_) ?? is_)("punc", ",") || (is_?.__call__?.bind(is_) ?? is_)("punc", "}"))) {
                            end = (prev?.__call__?.bind(prev) ?? prev)();
                            return (set_?.__call__?.bind(set_) ?? set_)(start, end, left);
                        }
                        if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(left, AST_Constant)) {
                            has_non_const_keys = true;
                        }
                        (expect?.__call__?.bind(expect) ?? expect)(":");
                        a.push(new AST_ObjectKeyVal({"start":start,"key":left,"value":(expression?.__call__?.bind(expression) ?? expression)(false),"end":(prev?.__call__?.bind(prev) ?? prev)()}));
                        if (a.length === 1 && (is_?.__call__?.bind(is_) ?? is_)("keyword", "for")) {
                            return (dict_comprehension?.__call__?.bind(dict_comprehension) ?? dict_comprehension)(a, is_pydict, is_jshash);
                        }
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    args = {"properties":a,"is_pydict":is_pydict,"is_jshash":is_jshash};
                    if (has_non_const_keys) {
                        return new AST_ExpressiveObject(args);
                    } else {
                        return new AST_Object(args);
                    }
                };
ρσ_anonfunc.__module__ = "parse";
undefined;
                return ρσ_anonfunc;
            })());

            function set_(start, end, expr) {
                var ostart, a;
                ostart = start;
                a = ρσ_list_decorate([ new AST_SetItem({"start":start,"end":end,"value":expr}) ]);
                while (!(is_?.__call__?.bind(is_) ?? is_)("punc", "}")) {
                    (expect?.__call__?.bind(expect) ?? expect)(",");
                    start = S.token;
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", "}")) {
                        break;
                    }
                    a.push(new AST_SetItem({"start":start,"value":(expression?.__call__?.bind(expression) ?? expression)(false),"end":(prev?.__call__?.bind(prev) ?? prev)()}));
                }
                (next?.__call__?.bind(next) ?? next)();
                return new AST_Set({"items":a,"start":ostart,"end":(prev?.__call__?.bind(prev) ?? prev)()});
            };
set_.__argnames__ = ["start", "end", "expr"];
set_.__module__ = "parse";
undefined;

            function read_ellipses_range(obj, terminator) {
                (next?.__call__?.bind(next) ?? next)();
                obj["last"] = (expression?.__call__?.bind(expression) ?? expression)(false);
                (expect?.__call__?.bind(expect) ?? expect)("]");
                return obj;
            };
read_ellipses_range.__argnames__ = ["obj", "terminator"];
read_ellipses_range.__module__ = "parse";
undefined;

            function read_comprehension(obj, terminator) {
                var forloop;
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(obj, AST_GeneratorComprehension)) {
                    baselib_items["yield"] = true;
                }
                S.in_comprehension = true;
                S.in_parenthesized_expr = false;
                (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "for");
                forloop = (for_?.__call__?.bind(for_) ?? for_)(true);
                obj.init = forloop.init;
                obj.name = forloop.name;
                obj.object = forloop.object;
                obj.condition = ((is_?.__call__?.bind(is_) ?? is_)("punc", terminator)) ? null : ((expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "if"), 
                (expression?.__call__?.bind(expression) ?? expression)(true));
                (expect?.__call__?.bind(expect) ?? expect)(terminator);
                S.in_comprehension = false;
                return obj;
            };
read_comprehension.__argnames__ = ["obj", "terminator"];
read_comprehension.__module__ = "parse";
undefined;

            function dict_comprehension(a, is_pydict, is_jshash) {
                var ρσ_unpack, left, right;
                if (a.length) {
                    ρσ_unpack = [a[0].key, a[0].value];
                    left = ρσ_unpack[0];
                    right = ρσ_unpack[1];
                } else {
                    left = (expression?.__call__?.bind(expression) ?? expression)(false);
                    if (!(is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                        return (read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_SetComprehension({"statement":left}), "}");
                    }
                    (expect?.__call__?.bind(expect) ?? expect)(":");
                    right = (expression?.__call__?.bind(expression) ?? expression)(false);
                }
                return (read_comprehension?.__call__?.bind(read_comprehension) ?? read_comprehension)(new AST_DictComprehension({"statement":left,"value_statement":right,"is_pydict":is_pydict,"is_jshash":is_jshash}), "}");
            };
dict_comprehension.__argnames__ = ["a", "is_pydict", "is_jshash"];
dict_comprehension.__module__ = "parse";
undefined;

            function as_name() {
                var tmp, tmp_;
                tmp = S.token;
                (next?.__call__?.bind(next) ?? next)();
                tmp_ = tmp.type;
                if (tmp_ === "name" || tmp_ === "operator" || tmp_ === "keyword" || tmp_ === "atom") {
                    return tmp.value;
                } else {
                    (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                }
            };
as_name.__module__ = "parse";
undefined;

            function token_as_symbol(tok, ttype) {
                var name, args;
                name = tok.value;
                if (RESERVED_WORDS[(typeof name === "number" && name < 0) ? RESERVED_WORDS.length + name : name] && name !== "this") {
                    (croak?.__call__?.bind(croak) ?? croak)(ρσ_operator_add(name, " is a reserved word"));
                }
                args = {"name":String(tok.value),"start":tok,"end":tok};
                if (name === "this") {
                    return new AST_This(args);
                } else {
                    return (js_new?.__call__?.bind(js_new) ?? js_new)(ttype, args);
                }
            };
token_as_symbol.__argnames__ = ["tok", "ttype"];
token_as_symbol.__module__ = "parse";
undefined;

            function as_symbol(ttype, noerror) {
                var sym;
                if (!(is_?.__call__?.bind(is_) ?? is_)("name")) {
                    if (!noerror) {
                        (croak?.__call__?.bind(croak) ?? croak)("Name expected");
                    }
                    return null;
                }
                sym = (token_as_symbol?.__call__?.bind(token_as_symbol) ?? token_as_symbol)(S.token, ttype);
                (next?.__call__?.bind(next) ?? next)();
                return sym;
            };
as_symbol.__argnames__ = ["ttype", "noerror"];
as_symbol.__module__ = "parse";
undefined;

            function new_symbol(type, name) {
                var args;
                args = {"name":String(name),"start":null,"end":null};
                if (name === "this") {
                    return new AST_This(args);
                } else {
                    return (js_new?.__call__?.bind(js_new) ?? js_new)(type, args);
                }
            };
new_symbol.__argnames__ = ["type", "name"];
new_symbol.__module__ = "parse";
undefined;

            function is_static_method(cls, method) {
                if ((has_prop?.__call__?.bind(has_prop) ?? has_prop)(COMMON_STATIC, method) || cls.static && (has_prop?.__call__?.bind(has_prop) ?? has_prop)(cls.static, method)) {
                    return true;
                } else {
                    return false;
                }
            };
is_static_method.__argnames__ = ["cls", "method"];
is_static_method.__module__ = "parse";
undefined;

            function getitem(expr, allow_calls) {
                var start, is_py_sub, slice_bounds, is_slice, i, prop, assignment;
                start = expr.start;
                (next?.__call__?.bind(next) ?? next)();
                is_py_sub = S.scoped_flags.get("overload_getitem", false);
                slice_bounds = [];
                is_slice = false;
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                    slice_bounds.push(null);
                } else {
                    slice_bounds.push((expression?.__call__?.bind(expression) ?? expression)(false));
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                    is_slice = true;
                    (next?.__call__?.bind(next) ?? next)();
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                        slice_bounds.push(null);
                    } else if (!(is_?.__call__?.bind(is_) ?? is_)("punc", "]")) {
                        slice_bounds.push((expression?.__call__?.bind(expression) ?? expression)(false));
                    }
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ":")) {
                    (next?.__call__?.bind(next) ?? next)();
                    if ((is_?.__call__?.bind(is_) ?? is_)("punc", "]")) {
                        (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                    } else {
                        slice_bounds.push((expression?.__call__?.bind(expression) ?? expression)(false));
                    }
                }
                while ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                    (next?.__call__?.bind(next) ?? next)();
                    slice_bounds.push((expression?.__call__?.bind(expression) ?? expression)(false));
                }
                (expect?.__call__?.bind(expect) ?? expect)("]");
                if (is_slice) {
                    if ((is_?.__call__?.bind(is_) ?? is_)("operator", "=")) {
                        (next?.__call__?.bind(next) ?? next)();
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Splice({"start":start,"expression":expr,"property":slice_bounds[0] || new AST_Number({"value":0}),"property2":slice_bounds[1],"assignment":(expression?.__call__?.bind(expression) ?? expression)(true),"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                    } else if (slice_bounds.length === 3) {
                        slice_bounds.unshift(slice_bounds.pop());
                        if (!slice_bounds[slice_bounds.length-1]) {
                            slice_bounds.pop();
                            if (!slice_bounds[slice_bounds.length-1]) {
                                slice_bounds.pop();
                            }
                        } else if (!slice_bounds[slice_bounds.length-2]) {
                            slice_bounds[slice_bounds.length-2] = new AST_Undefined;
                        }
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Call({"start":start,"expression":new AST_SymbolRef({"name":(S.in_delete) ? "ρσ_delslice" : "ρσ_eslice"}),"args":ρσ_list_decorate([ expr ]).concat(slice_bounds),"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                    } else {
                        slice_bounds = (function() {
                            var ρσ_Iter = slice_bounds, ρσ_Result = [], i;
                            ρσ_Iter = ((typeof ρσ_Iter[Symbol.iterator] === "function") ? (ρσ_Iter instanceof Map ? ρσ_Iter.keys() : ρσ_Iter) : Object.keys(ρσ_Iter));
                            for (var ρσ_Index of ρσ_Iter) {
                                i = ρσ_Index;
                                ρσ_Result.push((i === null) ? new AST_Number({"value":0}) : i);
                            }
                            ρσ_Result = ρσ_list_constructor(ρσ_Result);
                            return ρσ_Result;
                        })();
                        if (S.in_delete) {
                            return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Call({"start":start,"expression":new AST_SymbolRef({"name":"ρσ_delslice"}),"args":ρσ_list_decorate([ expr, new AST_Number({"value":1}) ]).concat(slice_bounds),"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                        }
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Call({"start":start,"expression":new AST_Dot({"start":start,"expression":expr,"property":"slice","end":(prev?.__call__?.bind(prev) ?? prev)()}),"args":slice_bounds,"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                    }
                } else {
                    if (ρσ_equals((len?.__call__?.bind(len) ?? len)(slice_bounds), 1)) {
                        prop = slice_bounds[0] || new AST_Number({"value":0});
                    } else {
                        prop = new AST_Array({"elements":slice_bounds});
                    }
                    if (is_py_sub) {
                        assignment = null;
                        if ((is_?.__call__?.bind(is_) ?? is_)("operator") && S.token.value === "=") {
                            (next?.__call__?.bind(next) ?? next)();
                            assignment = (expression?.__call__?.bind(expression) ?? expression)(true);
                        }
                        return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_ItemAccess({"start":start,"expression":expr,"property":prop,"assignment":assignment,"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                    }
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Sub({"start":start,"expression":expr,"property":prop,"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
                }
            };
getitem.__argnames__ = ["expr", "allow_calls"];
getitem.__module__ = "parse";
undefined;

            function call_(expr) {
                var start, ret, c, funcname, tmp_, args;
                start = expr.start;
                S.in_parenthesized_expr = true;
                (next?.__call__?.bind(next) ?? next)();
                if (!expr.parens && (get_class_in_scope?.__call__?.bind(get_class_in_scope) ?? get_class_in_scope)(expr)) {
                    ret = (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_New({"start":start,"expression":expr,"args":(func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)(),"end":(prev?.__call__?.bind(prev) ?? prev)()}), true);
                    S.in_parenthesized_expr = false;
                    return ret;
                } else {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_Dot)) {
                        c = (get_class_in_scope?.__call__?.bind(get_class_in_scope) ?? get_class_in_scope)(expr.expression);
                    }
                    if (c) {
                        funcname = expr;
                        ret = (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_ClassCall({"start":start,"class":expr.expression,"method":funcname.property,"static":(is_static_method?.__call__?.bind(is_static_method) ?? is_static_method)(c, funcname.property),"args":(func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)(),"end":(prev?.__call__?.bind(prev) ?? prev)()}), true);
                        S.in_parenthesized_expr = false;
                        return ret;
                    } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_SymbolRef)) {
                        tmp_ = expr.name;
                        if (tmp_ === "jstype") {
                            ret = new AST_UnaryPrefix({"start":start,"operator":"typeof","expression":(func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)()[0],"end":(prev?.__call__?.bind(prev) ?? prev)()});
                            S.in_parenthesized_expr = false;
                            return ret;
                        } else if (tmp_ === "isinstance") {
                            args = (func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)();
                            if (args.length !== 2) {
                                (croak?.__call__?.bind(croak) ?? croak)("isinstance() must be called with exactly two arguments");
                            }
                            ret = new AST_Binary({"start":start,"left":args[0],"operator":"instanceof","right":args[1],"end":(prev?.__call__?.bind(prev) ?? prev)()});
                            S.in_parenthesized_expr = false;
                            return ret;
                        }
                    }
                    ret = (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Call({"start":start,"expression":expr,"args":(func_call_list?.__call__?.bind(func_call_list) ?? func_call_list)(),"end":(prev?.__call__?.bind(prev) ?? prev)()}), true);
                    S.in_parenthesized_expr = false;
                    return ret;
                }
            };
call_.__argnames__ = ["expr"];
call_.__module__ = "parse";
undefined;

            function get_attr(expr, allow_calls) {
                var prop, c, classvars;
                (next?.__call__?.bind(next) ?? next)();
                prop = (as_name?.__call__?.bind(as_name) ?? as_name)();
                c = (get_class_in_scope?.__call__?.bind(get_class_in_scope) ?? get_class_in_scope)(expr);
                if (c) {
                    classvars = (c.processing) ? c.provisional_classvars : c.classvars;
                    if (classvars && classvars[prop]) {
                        prop = ρσ_operator_add("prototype.", prop);
                    }
                }
                return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(new AST_Dot({"start":expr.start,"expression":expr,"property":prop,"end":(prev?.__call__?.bind(prev) ?? prev)()}), allow_calls);
            };
get_attr.__argnames__ = ["expr", "allow_calls"];
get_attr.__module__ = "parse";
undefined;

            function existential(expr, allow_calls) {
                var ans, ttype, val, is_py_sub;
                ans = new AST_Existential({"start":expr.start,"end":S.token,"expression":expr});
                (next?.__call__?.bind(next) ?? next)();
                ttype = S.token.type;
                val = S.token.value;
                if (S.token.nlb || ttype === "keyword" || ttype === "operator" || ttype === "eof") {
                    ans.after = null;
                    return ans;
                }
                if (ttype === "punc") {
                    if (val === ".") {
                        ans.after = ".";
                    } else if (val === "[") {
                        is_py_sub = S.scoped_flags.get("overload_getitem", false);
                        ans.after = (is_py_sub) ? "g" : "[";
                    } else if (val === "(") {
                        if (!allow_calls) {
                            (unexpected?.__call__?.bind(unexpected) ?? unexpected)();
                        }
                        ans.after = "(";
                    } else {
                        ans.after = null;
                        return ans;
                    }
                    return (subscripts?.__call__?.bind(subscripts) ?? subscripts)(ans, allow_calls);
                }
                ans.after = (expression?.__call__?.bind(expression) ?? expression)();
                return ans;
            };
existential.__argnames__ = ["expr", "allow_calls"];
existential.__module__ = "parse";
undefined;

            function subscripts(expr, allow_calls) {
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", ".")) {
                    return (get_attr?.__call__?.bind(get_attr) ?? get_attr)(expr, allow_calls);
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", "[") && !S.token.nlb) {
                    return (getitem?.__call__?.bind(getitem) ?? getitem)(expr, allow_calls);
                }
                if (allow_calls && (is_?.__call__?.bind(is_) ?? is_)("punc", "(") && !S.token.nlb) {
                    return (call_?.__call__?.bind(call_) ?? call_)(expr);
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("punc", "?")) {
                    return (existential?.__call__?.bind(existential) ?? existential)(expr, allow_calls);
                }
                return expr;
            };
subscripts.__argnames__ = ["expr", "allow_calls"];
subscripts.__module__ = "parse";
undefined;

            function maybe_unary(allow_calls) {
                var start, expr, is_parenthesized, ex, val;
                start = S.token;
                if ((is_?.__call__?.bind(is_) ?? is_)("operator", "@")) {
                    if (S.parsing_decorator) {
                        (croak?.__call__?.bind(croak) ?? croak)("Nested decorators are not allowed");
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    S.parsing_decorator = true;
                    expr = (expression?.__call__?.bind(expression) ?? expression)();
                    S.parsing_decorator = false;
                    S.decorators.push(expr);
                    return new AST_EmptyStatement({"stype":"@","start":(prev?.__call__?.bind(prev) ?? prev)(),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                }
                if ((is_?.__call__?.bind(is_) ?? is_)("operator") && UNARY_PREFIX[ρσ_bound_index(start.value, UNARY_PREFIX)]) {
                    (next?.__call__?.bind(next) ?? next)();
                    is_parenthesized = (is_?.__call__?.bind(is_) ?? is_)("punc", "(");
                    S.in_delete = start.value === "delete";
                    expr = (maybe_unary?.__call__?.bind(maybe_unary) ?? maybe_unary)(allow_calls);
                    S.in_delete = false;
                    ex = (make_unary?.__call__?.bind(make_unary) ?? make_unary)(AST_UnaryPrefix, start.value, expr, is_parenthesized);
                    ex.start = start;
                    ex.end = (prev?.__call__?.bind(prev) ?? prev)();
                    return ex;
                }
                val = (expr_atom?.__call__?.bind(expr_atom) ?? expr_atom)(allow_calls);
                return val;
            };
maybe_unary.__argnames__ = ["allow_calls"];
maybe_unary.__module__ = "parse";
undefined;

            function make_unary(ctor, op, expr, is_parenthesized) {
                return (js_new?.__call__?.bind(js_new) ?? js_new)(ctor, {"operator":op,"expression":expr,"parenthesized":is_parenthesized});
            };
make_unary.__argnames__ = ["ctor", "op", "expr", "is_parenthesized"];
make_unary.__module__ = "parse";
undefined;

            function expr_op(left, min_prec, no_in) {
                var op, prec, right, ret;
                op = ((is_?.__call__?.bind(is_) ?? is_)("operator")) ? S.token.value : null;
                if (op === "!" && (peek?.__call__?.bind(peek) ?? peek)().type === "operator" && (peek?.__call__?.bind(peek) ?? peek)().value === "in") {
                    (next?.__call__?.bind(next) ?? next)();
                    S.token.value = op = "nin";
                }
                if (no_in && (op === "in" || op === "nin")) {
                    op = null;
                }
                prec = (op !== null) ? PRECEDENCE[(typeof op === "number" && op < 0) ? PRECEDENCE.length + op : op] : null;
                if (prec !== null && prec > min_prec) {
                    (next?.__call__?.bind(next) ?? next)();
                    right = (expr_op?.__call__?.bind(expr_op) ?? expr_op)((maybe_unary?.__call__?.bind(maybe_unary) ?? maybe_unary)(true), prec, no_in);
                    ret = new AST_Binary({"start":left.start,"left":left,"operator":op,"right":right,"end":right.end});
                    return (expr_op?.__call__?.bind(expr_op) ?? expr_op)(ret, min_prec, no_in);
                }
                return left;
            };
expr_op.__argnames__ = ["left", "min_prec", "no_in"];
expr_op.__module__ = "parse";
undefined;

            function expr_ops(no_in) {
                return (expr_op?.__call__?.bind(expr_op) ?? expr_op)((maybe_unary?.__call__?.bind(maybe_unary) ?? maybe_unary)(true), 0, no_in);
            };
expr_ops.__argnames__ = ["no_in"];
expr_ops.__module__ = "parse";
undefined;

            function maybe_conditional(no_in) {
                var start, expr, ne, conditional;
                start = S.token;
                expr = (expr_ops?.__call__?.bind(expr_ops) ?? expr_ops)(no_in);
                if ((is_?.__call__?.bind(is_) ?? is_)("keyword", "if") && (S.in_parenthesized_expr || S.statement_starting_token !== S.token && !S.in_comprehension && !S.token.nlb)) {
                    (next?.__call__?.bind(next) ?? next)();
                    ne = (expression?.__call__?.bind(expression) ?? expression)(false);
                    (expect_token?.__call__?.bind(expect_token) ?? expect_token)("keyword", "else");
                    conditional = new AST_Conditional({"start":start,"condition":ne,"consequent":expr,"alternative":(expression?.__call__?.bind(expression) ?? expression)(false, no_in),"end":(peek?.__call__?.bind(peek) ?? peek)()});
                    return conditional;
                }
                return expr;
            };
maybe_conditional.__argnames__ = ["no_in"];
maybe_conditional.__module__ = "parse";
undefined;

            function create_assign(data) {
                var ans, class_name, c, lhs;
                if (data.right && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(data.right, AST_Seq) && ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(data.right.car, AST_Assign) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(data.right.cdr, AST_Assign)) && data.operator !== "=") {
                    (token_error?.__call__?.bind(token_error) ?? token_error)(data.start, ρσ_operator_add("Invalid assignment operator for chained assignment: ", data.operator));
                }
                ans = new AST_Assign(data);
                if (S.in_class.length && (ρσ_expr_temp = S.in_class)[ρσ_expr_temp.length-1]) {
                    class_name = (ρσ_expr_temp = S.in_class)[ρσ_expr_temp.length-1];
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(ans.left, AST_SymbolRef) && S.classes.length > 1) {
                        c = (ρσ_expr_temp = (ρσ_expr_temp = S.classes)[ρσ_expr_temp.length-2])[(typeof class_name === "number" && class_name < 0) ? ρσ_expr_temp.length + class_name : class_name];
                        if (c) {
                            if (ans.is_chained()) {
                                var ρσ_Iter71 = ans.traverse_chain()[0];
                                ρσ_Iter71 = ((typeof ρσ_Iter71[Symbol.iterator] === "function") ? (ρσ_Iter71 instanceof Map ? ρσ_Iter71.keys() : ρσ_Iter71) : Object.keys(ρσ_Iter71));
                                for (var ρσ_Index71 of ρσ_Iter71) {
                                    lhs = ρσ_Index71;
                                    (ρσ_expr_temp = c.provisional_classvars)[ρσ_bound_index(lhs.name, ρσ_expr_temp)] = true;
                                }
                            } else {
                                (ρσ_expr_temp = c.provisional_classvars)[ρσ_bound_index(ans.left.name, ρσ_expr_temp)] = true;
                            }
                        }
                    }
                }
                return ans;
            };
create_assign.__argnames__ = ["data"];
create_assign.__module__ = "parse";
undefined;

            function maybe_assign(no_in, only_plain_assignment) {
                var start, left, val;
                start = S.token;
                left = (maybe_conditional?.__call__?.bind(maybe_conditional) ?? maybe_conditional)(no_in);
                val = S.token.value;
                if ((is_?.__call__?.bind(is_) ?? is_)("operator") && ASSIGNMENT[(typeof val === "number" && val < 0) ? ASSIGNMENT.length + val : val]) {
                    if (only_plain_assignment && val !== "=") {
                        (croak?.__call__?.bind(croak) ?? croak)(ρσ_operator_add("Invalid assignment operator for chained assignment: ", val));
                    }
                    (next?.__call__?.bind(next) ?? next)();
                    return (create_assign?.__call__?.bind(create_assign) ?? create_assign)({"start":start,"left":left,"operator":val,"right":(maybe_assign?.__call__?.bind(maybe_assign) ?? maybe_assign)(no_in, true),"end":(prev?.__call__?.bind(prev) ?? prev)()});
                }
                return left;
            };
maybe_assign.__argnames__ = ["no_in", "only_plain_assignment"];
maybe_assign.__module__ = "parse";
undefined;

            function expression(commas, no_in) {
                var start, expr, left;
                start = S.token;
                expr = (maybe_assign?.__call__?.bind(maybe_assign) ?? maybe_assign)(no_in);
                function build_seq(a) {
                    if (a.length === 1) {
                        return a[0];
                    }
                    return new AST_Seq({"start":start,"car":a.shift(),"cdr":(build_seq?.__call__?.bind(build_seq) ?? build_seq)(a),"end":(peek?.__call__?.bind(peek) ?? peek)()});
                };
build_seq.__argnames__ = ["a"];
build_seq.__module__ = "parse";
undefined;

                if (commas) {
                    left = [ expr ];
                    while ((is_?.__call__?.bind(is_) ?? is_)("punc", ",")) {
                        (next?.__call__?.bind(next) ?? next)();
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_Assign)) {
                            left[left.length-1] = left[left.length-1].left;
                            return (create_assign?.__call__?.bind(create_assign) ?? create_assign)({"start":start,"left":(left.length === 1) ? left[0] : new AST_Array({"elements":left}),"operator":expr.operator,"right":new AST_Seq({"car":expr.right,"cdr":(expression?.__call__?.bind(expression) ?? expression)(true, no_in)}),"end":(peek?.__call__?.bind(peek) ?? peek)()});
                        }
                        expr = (maybe_assign?.__call__?.bind(maybe_assign) ?? maybe_assign)(no_in);
                        left.push(expr);
                    }
                    if (left.length > 1 && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(left[left.length-1], AST_Assign)) {
                        left[left.length-1] = left[left.length-1].left;
                        return (create_assign?.__call__?.bind(create_assign) ?? create_assign)({"start":start,"left":new AST_Array({"elements":left}),"operator":expr.operator,"right":expr.right,"end":(peek?.__call__?.bind(peek) ?? peek)()});
                    }
                    return (build_seq?.__call__?.bind(build_seq) ?? build_seq)(left);
                }
                return expr;
            };
expression.__argnames__ = ["commas", "no_in"];
expression.__module__ = "parse";
undefined;

            function in_loop(cont) {
                var ret;
                S.in_loop = ρσ_operator_iadd(S.in_loop, 1);
                ret = (cont?.__call__?.bind(cont) ?? cont)();
                S.in_loop = ρσ_operator_isub(S.in_loop, 1);
                return ret;
            };
in_loop.__argnames__ = ["cont"];
in_loop.__module__ = "parse";
undefined;

            function run_parser() {
                var start, body, docstrings, first_token, toplevel, element, shebang, ds, end, seen_exports, item;
                start = S.token = (next?.__call__?.bind(next) ?? next)();
                body = [];
                docstrings = [];
                first_token = true;
                toplevel = options.toplevel;
                while (!(is_?.__call__?.bind(is_) ?? is_)("eof")) {
                    element = (statement?.__call__?.bind(statement) ?? statement)();
                    if (first_token && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(element, AST_Directive) && element.value.indexOf("#!") === 0) {
                        shebang = element.value;
                    } else {
                        ds = !toplevel && (is_docstring?.__call__?.bind(is_docstring) ?? is_docstring)(element);
                        if (ds) {
                            docstrings.push(ds);
                        } else {
                            body.push(element);
                        }
                    }
                    first_token = false;
                }
                end = (prev?.__call__?.bind(prev) ?? prev)();
                if (toplevel) {
                    toplevel.body = toplevel.body.concat(body);
                    toplevel.end = end;
                    toplevel.docstrings;
                } else {
                    toplevel = new AST_Toplevel({"start":start,"body":body,"shebang":shebang,"end":end,"docstrings":docstrings});
                }
                toplevel.nonlocalvars = (scan_for_nonlocal_defs?.__call__?.bind(scan_for_nonlocal_defs) ?? scan_for_nonlocal_defs)(toplevel.body).concat(S.globals);
                toplevel.localvars = ρσ_list_decorate([]);
                toplevel.exports = ρσ_list_decorate([]);
                seen_exports = Object.create(null);
                function add_item(item, isvar) {
                    var symbol;
                    if (toplevel.nonlocalvars.indexOf(item) < 0) {
                        symbol = (new_symbol?.__call__?.bind(new_symbol) ?? new_symbol)(AST_SymbolVar, item);
                        if (isvar) {
                            toplevel.localvars.push(symbol);
                        }
                        if (!(has_prop?.__call__?.bind(has_prop) ?? has_prop)(seen_exports, item)) {
                            toplevel.exports.push(symbol);
                            seen_exports[(typeof item === "number" && item < 0) ? seen_exports.length + item : item] = true;
                        }
                    }
                };
add_item.__argnames__ = ["item", "isvar"];
add_item.__module__ = "parse";
undefined;

                var ρσ_Iter72 = (scan_for_local_vars?.__call__?.bind(scan_for_local_vars) ?? scan_for_local_vars)(toplevel.body);
                ρσ_Iter72 = ((typeof ρσ_Iter72[Symbol.iterator] === "function") ? (ρσ_Iter72 instanceof Map ? ρσ_Iter72.keys() : ρσ_Iter72) : Object.keys(ρσ_Iter72));
                for (var ρσ_Index72 of ρσ_Iter72) {
                    item = ρσ_Index72;
                    (add_item?.__call__?.bind(add_item) ?? add_item)(item, true);
                }
                var ρσ_Iter73 = (scan_for_top_level_callables?.__call__?.bind(scan_for_top_level_callables) ?? scan_for_top_level_callables)(toplevel.body);
                ρσ_Iter73 = ((typeof ρσ_Iter73[Symbol.iterator] === "function") ? (ρσ_Iter73 instanceof Map ? ρσ_Iter73.keys() : ρσ_Iter73) : Object.keys(ρσ_Iter73));
                for (var ρσ_Index73 of ρσ_Iter73) {
                    item = ρσ_Index73;
                    (add_item?.__call__?.bind(add_item) ?? add_item)(item, false);
                }
                toplevel.filename = options.filename;
                toplevel.imported_module_ids = imported_module_ids;
                toplevel.classes = (scan_for_classes?.__call__?.bind(scan_for_classes) ?? scan_for_classes)(toplevel.body);
                toplevel.import_order = Object.keys(imported_modules).length;
                toplevel.module_id = module_id;
                imported_modules[(typeof module_id === "number" && module_id < 0) ? imported_modules.length + module_id : module_id] = toplevel;
                toplevel.imports = imported_modules;
                toplevel.baselib = baselib_items;
                toplevel.scoped_flags = S.scoped_flags.stack[0];
                importing_modules[(typeof module_id === "number" && module_id < 0) ? importing_modules.length + module_id : module_id] = false;
                toplevel.comments_after = S.token.comments_before || [];
                return toplevel;
            };
run_parser.__module__ = "parse";
undefined;

            return run_parser;
        };
create_parser_ctx.__argnames__ = ["S", "import_dirs", "module_id", "baselib_items", "imported_module_ids", "imported_modules", "importing_modules", "options"];
create_parser_ctx.__module__ = "parse";
undefined;

        function parse(text, options) {
            var import_dirs, x, location, module_id, baselib_items, imported_module_ids, imported_modules, importing_modules, S, name, obj, cname;
            options = (defaults?.__call__?.bind(defaults) ?? defaults)(options, {"filename":null,"module_id":"__main__","toplevel":null,"for_linting":false,"import_dirs":[],"classes":undefined,"scoped_flags":Object.create(null),"discard_asserts":false,"module_cache_dir":"","jsage":false,"tokens":false});
            import_dirs = (function() {
                var ρσ_Iter = options.import_dirs, ρσ_Result = [], x;
                ρσ_Iter = ((typeof ρσ_Iter[Symbol.iterator] === "function") ? (ρσ_Iter instanceof Map ? ρσ_Iter.keys() : ρσ_Iter) : Object.keys(ρσ_Iter));
                for (var ρσ_Index of ρσ_Iter) {
                    x = ρσ_Index;
                    ρσ_Result.push(x);
                }
                ρσ_Result = ρσ_list_constructor(ρσ_Result);
                return ρσ_Result;
            })();
            var ρσ_Iter74 = [options.libdir, options.basedir];
            ρσ_Iter74 = ((typeof ρσ_Iter74[Symbol.iterator] === "function") ? (ρσ_Iter74 instanceof Map ? ρσ_Iter74.keys() : ρσ_Iter74) : Object.keys(ρσ_Iter74));
            for (var ρσ_Index74 of ρσ_Iter74) {
                location = ρσ_Index74;
                if (location) {
                    import_dirs.push(location);
                }
            }
            module_id = options.module_id;
            baselib_items = Object.create(null);
            imported_module_ids = ρσ_list_decorate([]);
            imported_modules = options.imported_modules || Object.create(null);
            importing_modules = options.importing_modules || Object.create(null);
            importing_modules[(typeof module_id === "number" && module_id < 0) ? importing_modules.length + module_id : module_id] = true;
            function push() {
                this.stack.push(Object.create(null));
            };
push.__module__ = "parse";
undefined;

            function pop() {
                this.stack.pop();
            };
pop.__module__ = "parse";
undefined;

            function get(name, defval) {
                var d, q, i;
                for (var ρσ_Index75 = ρσ_operator_sub(this.stack.length, 1); ρσ_Index75 > -1; ρσ_Index75-=1) {
                    i = ρσ_Index75;
                    d = (ρσ_expr_temp = this.stack)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
                    q = d[(typeof name === "number" && name < 0) ? d.length + name : name];
                    if (q) {
                        return q;
                    }
                }
                return defval;
            };
get.__argnames__ = ["name", "defval"];
get.__module__ = "parse";
undefined;

            function set(name, val) {
                (ρσ_expr_temp = (ρσ_expr_temp = this.stack)[ρσ_expr_temp.length-1])[(typeof name === "number" && name < 0) ? ρσ_expr_temp.length + name : name] = val;
            };
set.__argnames__ = ["name", "val"];
set.__module__ = "parse";
undefined;

            S = {"input":(typeof text === "string") ? (tokenizer?.__call__?.bind(tokenizer) ?? tokenizer)(text, options.filename) : text,"token":null,"prev":null,"peeked":ρσ_list_decorate([]),"in_function":0,"statement_starting_token":null,"in_comprehension":false,"in_parenthesized_expr":false,"in_delete":false,"in_loop":0,"in_class":ρσ_list_decorate([ false ]),"classes":ρσ_list_decorate([ Object.create(null) ]),"functions":ρσ_list_decorate([ Object.create(null) ]),"labels":ρσ_list_decorate([]),"decorators":[],"parsing_decorator":false,"globals":[],"scoped_flags":{"stack":[options.scoped_flags || Object.create(null)],"push":push,"pop":pop,"get":get,"set":set}};
            if (options.jsage) {
                var ρσ_Iter76 = ρσ_list_decorate([ "exponent", "ellipses" ]);
                ρσ_Iter76 = ((typeof ρσ_Iter76[Symbol.iterator] === "function") ? (ρσ_Iter76 instanceof Map ? ρσ_Iter76.keys() : ρσ_Iter76) : Object.keys(ρσ_Iter76));
                for (var ρσ_Index76 of ρσ_Iter76) {
                    name = ρσ_Index76;
                    S.scoped_flags.set(name, true);
                }
            }
            if (S.scoped_flags.get("exponent")) {
                S.input.context()["exponent"] = true;
            }
            if (options.classes) {
                var ρσ_Iter77 = options.classes;
                ρσ_Iter77 = ((typeof ρσ_Iter77[Symbol.iterator] === "function") ? (ρσ_Iter77 instanceof Map ? ρσ_Iter77.keys() : ρσ_Iter77) : Object.keys(ρσ_Iter77));
                for (var ρσ_Index77 of ρσ_Iter77) {
                    cname = ρσ_Index77;
                    obj = (ρσ_expr_temp = options.classes)[(typeof cname === "number" && cname < 0) ? ρσ_expr_temp.length + cname : cname];
                    (ρσ_expr_temp = S.classes[0])[(typeof cname === "number" && cname < 0) ? ρσ_expr_temp.length + cname : cname] = {"static":obj.static,"bound":obj.bound,"classvars":obj.classvars};
                }
            }
            return (create_parser_ctx?.__call__?.bind(create_parser_ctx) ?? create_parser_ctx)(S, import_dirs, module_id, baselib_items, imported_module_ids, imported_modules, importing_modules, options)();
        };
parse.__argnames__ = ["text", "options"];
parse.__module__ = "parse";
undefined;

        ρσ_modules.parse.COMPILER_VERSION = COMPILER_VERSION;
        ρσ_modules.parse.PYTHON_FLAGS = PYTHON_FLAGS;
        ρσ_modules.parse.NATIVE_CLASSES = NATIVE_CLASSES;
        ρσ_modules.parse.ERROR_CLASSES = ERROR_CLASSES;
        ρσ_modules.parse.COMMON_STATIC = COMMON_STATIC;
        ρσ_modules.parse.FORBIDDEN_CLASS_VARS = FORBIDDEN_CLASS_VARS;
        ρσ_modules.parse.UNARY_PREFIX = UNARY_PREFIX;
        ρσ_modules.parse.ASSIGNMENT = ASSIGNMENT;
        ρσ_modules.parse.PRECEDENCE = PRECEDENCE;
        ρσ_modules.parse.STATEMENTS_WITH_LABELS = STATEMENTS_WITH_LABELS;
        ρσ_modules.parse.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
        ρσ_modules.parse.compile_time_decorators = compile_time_decorators;
        ρσ_modules.parse.get_compiler_version = get_compiler_version;
        ρσ_modules.parse.static_predicate = static_predicate;
        ρσ_modules.parse.operator_to_precedence = operator_to_precedence;
        ρσ_modules.parse.has_simple_decorator = has_simple_decorator;
        ρσ_modules.parse.has_setter_decorator = has_setter_decorator;
        ρσ_modules.parse.create_parser_ctx = create_parser_ctx;
        ρσ_modules.parse.parse = parse;
    })();

    (function(){
        var __name__ = "output";

    })();

    (function(){
        var __name__ = "output.stream";
        var DANGEROUS, require_semi_colon_chars, output_stream_defaults;
        var make_predicate = ρσ_modules.utils.make_predicate;
        var defaults = ρσ_modules.utils.defaults;
        var repeat_string = ρσ_modules.utils.repeat_string;

        var is_identifier_char = ρσ_modules.tokenizer.is_identifier_char;

        DANGEROUS = new RegExp("[\\u0000\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g");
        function as_hex(code, sz) {
            var val;
            val = code.toString(16);
            if (val.length < sz) {
                val = ρσ_operator_add("0".repeat(ρσ_operator_sub(sz, val.length)), val);
            }
            return val;
        };
as_hex.__argnames__ = ["code", "sz"];
as_hex.__module__ = "output.stream";
undefined;

        function to_ascii(str_, identifier) {
            function f(ch) {
                var code;
                code = ch.charCodeAt(0).toString(16);
                if (code.length <= 2 && !identifier) {
                    return ρσ_operator_add("\\x", (as_hex?.__call__?.bind(as_hex) ?? as_hex)(code, 2));
                } else {
                    return ρσ_operator_add("\\u", (as_hex?.__call__?.bind(as_hex) ?? as_hex)(code, 4));
                }
            };
f.__argnames__ = ["ch"];
f.__module__ = "output.stream";
undefined;

            return str_.replace(new RegExp("[\\u0080-\\uffff]", "g"), f);
        };
to_ascii.__argnames__ = ["str_", "identifier"];
to_ascii.__module__ = "output.stream";
undefined;

        function encode_string(str_) {
            function f(a) {
                return ρσ_operator_add("\\u", (as_hex?.__call__?.bind(as_hex) ?? as_hex)(a.charCodeAt(0), 4));
            };
f.__argnames__ = ["a"];
f.__module__ = "output.stream";
undefined;

            return JSON.stringify(str_).replace(DANGEROUS, f);
        };
encode_string.__argnames__ = ["str_"];
encode_string.__module__ = "output.stream";
undefined;

        require_semi_colon_chars = (make_predicate?.__call__?.bind(make_predicate) ?? make_predicate)("( [ + * / - , .");
        output_stream_defaults = {"indent_start":0,"indent_level":4,"quote_keys":false,"space_colon":true,"ascii_only":false,"width":80,"max_line_len":32e3,"ie_proof":true,"beautify":false,"source_map":null,"bracketize":false,"semicolons":true,"comments":false,"preserve_line":false,"omit_baselib":false,"baselib_plain":null,"private_scope":true,"keep_docstrings":false,"discard_asserts":false,"module_cache_dir":"","write_name":true};
        function OutputStream() {
            if (this.ρσ_object_id === undefined) Object.defineProperty(this, "ρσ_object_id", {"value":++ρσ_object_counter});
            OutputStream.prototype.__init__.apply(this, arguments);
        }
        OutputStream.prototype.__init__ = function __init__(options) {
            var self = this;
            self.options = (defaults?.__call__?.bind(defaults) ?? defaults)(options, output_stream_defaults, true);
            self._indentation = 0;
            self.current_col = 0;
            self.current_line = 1;
            self.current_pos = 0;
            self.OUTPUT = "";
            self.might_need_space = false;
            self.might_need_semicolon = false;
            self._last = null;
            self._stack = ρσ_list_decorate([]);
            self.index_counter = 0;
            self.with_counter = 0;
            self.try_else_counter = 0;
        };
OutputStream.prototype.__init__.__argnames__ = ["options"];
OutputStream.prototype.__init__.__module__ = "output.stream";
undefined;
        OutputStream.__argnames__ = OutputStream.prototype.__init__.__argnames__;
        OutputStream.__handles_kwarg_interpolation__ = OutputStream.prototype.__init__.__handles_kwarg_interpolation__;
        OutputStream.prototype.new_try_else_counter = function new_try_else_counter() {
            var self = this;
            self.try_else_counter = ρσ_operator_iadd(self.try_else_counter, 1);
            return ρσ_operator_add("ρσ_try_else_", self.try_else_counter);
        };
OutputStream.prototype.new_try_else_counter.__module__ = "output.stream";
undefined;
        OutputStream.prototype.make_name = function make_name(name) {
            var self = this;
            name = name.toString();
            if (self.options.ascii_only) {
                name = (to_ascii?.__call__?.bind(to_ascii) ?? to_ascii)(name, true);
            }
            return name;
        };
OutputStream.prototype.make_name.__argnames__ = ["name"];
OutputStream.prototype.make_name.__module__ = "output.stream";
undefined;
        OutputStream.prototype.print_name = function print_name(name) {
            var self = this;
            self.print(self.make_name(name));
        };
OutputStream.prototype.print_name.__argnames__ = ["name"];
OutputStream.prototype.print_name.__module__ = "output.stream";
undefined;
        OutputStream.prototype.make_indent = function make_indent(back) {
            var self = this;
            return (repeat_string?.__call__?.bind(repeat_string) ?? repeat_string)(" ", ρσ_operator_sub(ρσ_operator_add(self.options.indent_start, self._indentation), ρσ_operator_mul(back, self.options.indent_level)));
        };
OutputStream.prototype.make_indent.__argnames__ = ["back"];
OutputStream.prototype.make_indent.__module__ = "output.stream";
undefined;
        OutputStream.prototype.last_char = function last_char() {
            var self = this;
            return self._last.charAt(ρσ_operator_sub(self._last.length, 1));
        };
OutputStream.prototype.last_char.__module__ = "output.stream";
undefined;
        OutputStream.prototype.maybe_newline = function maybe_newline() {
            var self = this;
            if (self.options.max_line_len && self.current_col > self.options.max_line_len) {
                self.print("\n");
            }
        };
OutputStream.prototype.maybe_newline.__module__ = "output.stream";
undefined;
        OutputStream.prototype.print = function print(str_) {
            var self = this;
            var ch, target_line, prev, a, n;
            str_ = new String(str_);
            ch = str_.charAt(0);
            if (self.might_need_semicolon) {
                if ((!ch || ";}".indexOf(ch) < 0) && !new RegExp("[;]").test(self._last)) {
                    if (self.options.semicolons || require_semi_colon_chars[(typeof ch === "number" && ch < 0) ? require_semi_colon_chars.length + ch : ch]) {
                        self.OUTPUT = ρσ_operator_iadd(self.OUTPUT, ";");
                        self.current_col = ρσ_operator_iadd(self.current_col, 1);
                        self.current_pos = ρσ_operator_iadd(self.current_pos, 1);
                    } else {
                        self.OUTPUT = ρσ_operator_iadd(self.OUTPUT, "\n");
                        self.current_pos = ρσ_operator_iadd(self.current_pos, 1);
                        self.current_line = ρσ_operator_iadd(self.current_line, 1);
                        self.current_col = 0;
                    }
                    if (!self.options.beautify) {
                        self.might_need_space = false;
                    }
                }
                self.might_need_semicolon = false;
                self.maybe_newline();
            }
            if (!self.options.beautify && self.options.preserve_line && (ρσ_expr_temp = self._stack)[ρσ_bound_index(ρσ_operator_sub(self._stack.length, 1), ρσ_expr_temp)]) {
                target_line = (ρσ_expr_temp = self._stack)[ρσ_bound_index(ρσ_operator_sub(self._stack.length, 1), ρσ_expr_temp)].start.line;
                while (self.current_line < target_line) {
                    self.OUTPUT = ρσ_operator_iadd(self.OUTPUT, "\n");
                    self.current_pos = ρσ_operator_iadd(self.current_pos, 1);
                    self.current_line = ρσ_operator_iadd(self.current_line, 1);
                    self.current_col = 0;
                    self.might_need_space = false;
                }
            }
            if (self.might_need_space) {
                prev = self.last_char();
                if ((is_identifier_char?.__call__?.bind(is_identifier_char) ?? is_identifier_char)(prev) && ((is_identifier_char?.__call__?.bind(is_identifier_char) ?? is_identifier_char)(ch) || ch === "\\") || new RegExp("^[\\+\\-\\/]$").test(ch) && ch === prev) {
                    self.OUTPUT = ρσ_operator_iadd(self.OUTPUT, " ");
                    self.current_col = ρσ_operator_iadd(self.current_col, 1);
                    self.current_pos = ρσ_operator_iadd(self.current_pos, 1);
                }
                self.might_need_space = false;
            }
            a = str_.split(new RegExp("\\r?\\n"));
            n = ρσ_operator_sub(a.length, 1);
            self.current_line = ρσ_operator_iadd(self.current_line, n);
            if (n === 0) {
                self.current_col = ρσ_operator_iadd(self.current_col, a[(typeof n === "number" && n < 0) ? a.length + n : n].length);
            } else {
                self.current_col = a[(typeof n === "number" && n < 0) ? a.length + n : n].length;
            }
            self.current_pos = ρσ_operator_iadd(self.current_pos, str_.length);
            self._last = str_;
            self.OUTPUT = ρσ_operator_iadd(self.OUTPUT, str_);
        };
OutputStream.prototype.print.__argnames__ = ["str_"];
OutputStream.prototype.print.__module__ = "output.stream";
undefined;
        OutputStream.prototype.space = function space() {
            var self = this;
            if (self.options.beautify) {
                self.print(" ");
            } else {
                self.might_need_space = true;
            }
        };
OutputStream.prototype.space.__module__ = "output.stream";
undefined;
        OutputStream.prototype.indent = function indent(half) {
            var self = this;
            if (self.options.beautify) {
                self.print(self.make_indent((half) ? .5 : 0));
            }
        };
OutputStream.prototype.indent.__argnames__ = ["half"];
OutputStream.prototype.indent.__module__ = "output.stream";
undefined;
        OutputStream.prototype.with_indent = function with_indent(col, proceed) {
            var self = this;
            var save_indentation, ret;
            if (self.options.beautify) {
                if (col === true) {
                    col = self.next_indent();
                }
                save_indentation = self._indentation;
                self._indentation = col;
                ret = (proceed?.__call__?.bind(proceed) ?? proceed)();
                self._indentation = save_indentation;
                return ret;
            } else {
                return (proceed?.__call__?.bind(proceed) ?? proceed)();
            }
        };
OutputStream.prototype.with_indent.__argnames__ = ["col", "proceed"];
OutputStream.prototype.with_indent.__module__ = "output.stream";
undefined;
        OutputStream.prototype.indentation = function indentation() {
            var self = this;
            return self._indentation;
        };
OutputStream.prototype.indentation.__module__ = "output.stream";
undefined;
        OutputStream.prototype.set_indentation = function set_indentation(val) {
            var self = this;
            if (self.options.beautify) {
                self._indentation = val;
            }
        };
OutputStream.prototype.set_indentation.__argnames__ = ["val"];
OutputStream.prototype.set_indentation.__module__ = "output.stream";
undefined;
        OutputStream.prototype.newline = function newline() {
            var self = this;
            if (self.options.beautify) {
                self.print("\n");
            }
        };
OutputStream.prototype.newline.__module__ = "output.stream";
undefined;
        OutputStream.prototype.semicolon = function semicolon() {
            var self = this;
            if (self.options.beautify) {
                self.print(";");
            } else {
                self.might_need_semicolon = true;
            }
        };
OutputStream.prototype.semicolon.__module__ = "output.stream";
undefined;
        OutputStream.prototype.force_semicolon = function force_semicolon() {
            var self = this;
            self.might_need_semicolon = false;
            self.print(";");
        };
OutputStream.prototype.force_semicolon.__module__ = "output.stream";
undefined;
        OutputStream.prototype.next_indent = function next_indent() {
            var self = this;
            return ρσ_operator_add(self._indentation, self.options.indent_level);
        };
OutputStream.prototype.next_indent.__module__ = "output.stream";
undefined;
        OutputStream.prototype.spaced = function spaced() {
            var self = this;
            var i;
            var ρσ_Iter78 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(arguments));
            ρσ_Iter78 = ((typeof ρσ_Iter78[Symbol.iterator] === "function") ? (ρσ_Iter78 instanceof Map ? ρσ_Iter78.keys() : ρσ_Iter78) : Object.keys(ρσ_Iter78));
            for (var ρσ_Index78 of ρσ_Iter78) {
                i = ρσ_Index78;
                if (i > 0) {
                    self.space();
                }
                if (typeof arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].print === "function") {
                    arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i].print(self);
                } else {
                    self.print(arguments[(typeof i === "number" && i < 0) ? arguments.length + i : i]);
                }
            }
        };
OutputStream.prototype.spaced.__module__ = "output.stream";
undefined;
        OutputStream.prototype.end_statement = function end_statement() {
            var self = this;
            self.semicolon();
            self.newline();
        };
OutputStream.prototype.end_statement.__module__ = "output.stream";
undefined;
        OutputStream.prototype.with_block = function with_block(cont) {
            var self = this;
            var ret;
            ret = null;
            self.print("{");
            self.newline();
            function f() {
                ret = (cont?.__call__?.bind(cont) ?? cont)();
            };
f.__module__ = "output.stream";
undefined;

            self.with_indent(self.next_indent(), f);
            self.indent();
            self.print("}");
            return ret;
        };
OutputStream.prototype.with_block.__argnames__ = ["cont"];
OutputStream.prototype.with_block.__module__ = "output.stream";
undefined;
        OutputStream.prototype.with_parens = function with_parens(cont) {
            var self = this;
            var ret;
            self.print("(");
            ret = (cont?.__call__?.bind(cont) ?? cont)();
            self.print(")");
            return ret;
        };
OutputStream.prototype.with_parens.__argnames__ = ["cont"];
OutputStream.prototype.with_parens.__module__ = "output.stream";
undefined;
        OutputStream.prototype.with_square = function with_square(cont) {
            var self = this;
            var ret;
            self.print("[");
            ret = (cont?.__call__?.bind(cont) ?? cont)();
            self.print("]");
            return ret;
        };
OutputStream.prototype.with_square.__argnames__ = ["cont"];
OutputStream.prototype.with_square.__module__ = "output.stream";
undefined;
        OutputStream.prototype.comma = function comma() {
            var self = this;
            self.print(",");
            self.space();
        };
OutputStream.prototype.comma.__module__ = "output.stream";
undefined;
        OutputStream.prototype.colon = function colon() {
            var self = this;
            self.print(":");
            if (self.options.space_colon) {
                self.space();
            }
        };
OutputStream.prototype.colon.__module__ = "output.stream";
undefined;
        OutputStream.prototype.get = function get() {
            var self = this;
            return self.OUTPUT;
        };
OutputStream.prototype.get.__module__ = "output.stream";
undefined;
        OutputStream.prototype.assign = function assign(name) {
            var self = this;
            if (typeof name === "string") {
                self.print(name);
            } else {
                name.print(self);
            }
            self.space();
            self.print("=");
            self.space();
        };
OutputStream.prototype.assign.__argnames__ = ["name"];
OutputStream.prototype.assign.__module__ = "output.stream";
undefined;
        OutputStream.prototype.current_width = function current_width() {
            var self = this;
            return ρσ_operator_sub(self.current_col, self._indentation);
        };
OutputStream.prototype.current_width.__module__ = "output.stream";
undefined;
        OutputStream.prototype.should_break = function should_break() {
            var self = this;
            return self.options.width && self.current_width() >= self.options.width;
        };
OutputStream.prototype.should_break.__module__ = "output.stream";
undefined;
        OutputStream.prototype.last = function last() {
            var self = this;
            return self._last;
        };
OutputStream.prototype.last.__module__ = "output.stream";
undefined;
        OutputStream.prototype.print_string = function print_string(str_) {
            var self = this;
            self.print((encode_string?.__call__?.bind(encode_string) ?? encode_string)(str_));
        };
OutputStream.prototype.print_string.__argnames__ = ["str_"];
OutputStream.prototype.print_string.__module__ = "output.stream";
undefined;
        OutputStream.prototype.line = function line() {
            var self = this;
            return self.current_line;
        };
OutputStream.prototype.line.__module__ = "output.stream";
undefined;
        OutputStream.prototype.col = function col() {
            var self = this;
            return self.current_col;
        };
OutputStream.prototype.col.__module__ = "output.stream";
undefined;
        OutputStream.prototype.pos = function pos() {
            var self = this;
            return self.current_pos;
        };
OutputStream.prototype.pos.__module__ = "output.stream";
undefined;
        OutputStream.prototype.push_node = function push_node(node) {
            var self = this;
            self._stack.push(node);
        };
OutputStream.prototype.push_node.__argnames__ = ["node"];
OutputStream.prototype.push_node.__module__ = "output.stream";
undefined;
        OutputStream.prototype.pop_node = function pop_node() {
            var self = this;
            return self._stack.pop();
        };
OutputStream.prototype.pop_node.__module__ = "output.stream";
undefined;
        OutputStream.prototype.stack = function stack() {
            var self = this;
            return self._stack;
        };
OutputStream.prototype.stack.__module__ = "output.stream";
undefined;
        OutputStream.prototype.parent = function parent(n) {
            var self = this;
            return (ρσ_expr_temp = self._stack)[ρσ_bound_index(ρσ_operator_sub(ρσ_operator_sub(self._stack.length, 2), (n || 0)), ρσ_expr_temp)];
        };
OutputStream.prototype.parent.__argnames__ = ["n"];
OutputStream.prototype.parent.__module__ = "output.stream";
undefined;
        OutputStream.prototype.__repr__ = function __repr__ () {
                        return "<" + __name__ + "." + this.constructor.name + " #" + this.ρσ_object_id + ">";
        };
        OutputStream.prototype.__str__ = function __str__ () {
            return this.__repr__();
        };
        Object.defineProperty(OutputStream.prototype, "__bases__", {value: []});
        OutputStream.prototype.toString = OutputStream.prototype.get;

        ρσ_modules["output.stream"].DANGEROUS = DANGEROUS;
        ρσ_modules["output.stream"].require_semi_colon_chars = require_semi_colon_chars;
        ρσ_modules["output.stream"].output_stream_defaults = output_stream_defaults;
        ρσ_modules["output.stream"].as_hex = as_hex;
        ρσ_modules["output.stream"].to_ascii = to_ascii;
        ρσ_modules["output.stream"].encode_string = encode_string;
        ρσ_modules["output.stream"].OutputStream = OutputStream;
    })();

    (function(){
        var __name__ = "output.statements";
        var AST_Definitions = ρσ_modules.ast_types.AST_Definitions;
        var AST_Scope = ρσ_modules.ast_types.AST_Scope;
        var AST_Method = ρσ_modules.ast_types.AST_Method;
        var AST_Except = ρσ_modules.ast_types.AST_Except;
        var AST_EmptyStatement = ρσ_modules.ast_types.AST_EmptyStatement;
        var AST_Statement = ρσ_modules.ast_types.AST_Statement;
        var AST_Seq = ρσ_modules.ast_types.AST_Seq;
        var AST_BaseCall = ρσ_modules.ast_types.AST_BaseCall;
        var AST_Dot = ρσ_modules.ast_types.AST_Dot;
        var AST_Sub = ρσ_modules.ast_types.AST_Sub;
        var AST_ItemAccess = ρσ_modules.ast_types.AST_ItemAccess;
        var AST_Conditional = ρσ_modules.ast_types.AST_Conditional;
        var AST_Binary = ρσ_modules.ast_types.AST_Binary;
        var AST_BlockStatement = ρσ_modules.ast_types.AST_BlockStatement;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        function force_statement(stat, output) {
            if (output.options.bracketize) {
                if (!stat || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stat, AST_EmptyStatement)) {
                    output.print("{}");
                } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stat, AST_BlockStatement)) {
                    stat.print(output);
                } else {
                    function f() {
                        output.indent();
                        stat.print(output);
                        output.newline();
                    };
f.__module__ = "output.statements";
undefined;

                    output.with_block(f);
                }
            } else {
                if (!stat || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stat, AST_EmptyStatement)) {
                    output.force_semicolon();
                } else {
                    stat.print(output);
                }
            }
        };
force_statement.__argnames__ = ["stat", "output"];
force_statement.__module__ = "output.statements";
undefined;

        function first_in_statement(output) {
            var a, i, node, p;
            a = output.stack();
            i = a.length;
            i = ρσ_operator_isub(i, 1);
            node = a[(typeof i === "number" && i < 0) ? a.length + i : i];
            i = ρσ_operator_isub(i, 1);
            p = a[(typeof i === "number" && i < 0) ? a.length + i : i];
            while (i > 0) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Statement) && p.body === node) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Seq) && p.car === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_BaseCall) && p.expression === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Dot) && p.expression === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Sub) && p.expression === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_ItemAccess) && p.expression === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Conditional) && p.condition === node || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary) && p.left === node) {
                    node = p;
                    i = ρσ_operator_isub(i, 1);
                    p = a[(typeof i === "number" && i < 0) ? a.length + i : i];
                } else {
                    return false;
                }
            }
        };
first_in_statement.__argnames__ = ["output"];
first_in_statement.__module__ = "output.statements";
undefined;

        function declare_vars(vars, output) {
            var ρσ_unpack, i, arg;
            if (vars.length) {
                output.indent();
                output.print("var");
                output.space();
                var ρσ_Iter79 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(vars);
                ρσ_Iter79 = ((typeof ρσ_Iter79[Symbol.iterator] === "function") ? (ρσ_Iter79 instanceof Map ? ρσ_Iter79.keys() : ρσ_Iter79) : Object.keys(ρσ_Iter79));
                for (var ρσ_Index79 of ρσ_Iter79) {
                    ρσ_unpack = ρσ_Index79;
                    i = ρσ_unpack[0];
                    arg = ρσ_unpack[1];
                    if (i) {
                        output.comma();
                    }
                    arg.print(output);
                }
                output.semicolon();
                output.newline();
            }
        };
declare_vars.__argnames__ = ["vars", "output"];
declare_vars.__module__ = "output.statements";
undefined;

        function display_body(body, is_toplevel, output) {
            var last, ρσ_unpack, i, stmt;
            last = ρσ_operator_sub(body.length, 1);
            var ρσ_Iter80 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(body);
            ρσ_Iter80 = ((typeof ρσ_Iter80[Symbol.iterator] === "function") ? (ρσ_Iter80 instanceof Map ? ρσ_Iter80.keys() : ρσ_Iter80) : Object.keys(ρσ_Iter80));
            for (var ρσ_Index80 of ρσ_Iter80) {
                ρσ_unpack = ρσ_Index80;
                i = ρσ_unpack[0];
                stmt = ρσ_unpack[1];
                if (!((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_EmptyStatement)) && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Definitions))) {
                    output.indent();
                    stmt.print(output);
                    if (!((i === last && is_toplevel))) {
                        output.newline();
                    }
                }
            }
        };
display_body.__argnames__ = ["body", "is_toplevel", "output"];
display_body.__module__ = "output.statements";
undefined;

        function display_complex_body(node, is_toplevel, output, function_preamble) {
            var offset;
            offset = 0;
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Method) && !node.static) {
                output.indent();
                output.print("var");
                output.space();
                output.assign(node.argnames[0]);
                output.print("this");
                output.semicolon();
                output.newline();
                offset = ρσ_operator_iadd(offset, 1);
            }
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Scope)) {
                (function_preamble?.__call__?.bind(function_preamble) ?? function_preamble)(node, output, offset);
                (declare_vars?.__call__?.bind(declare_vars) ?? declare_vars)(node.localvars, output);
            } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Except)) {
                if (node.argname) {
                    output.indent();
                    output.print("var");
                    output.space();
                    output.assign(node.argname);
                    output.print("ρσ_Exception");
                    output.semicolon();
                    output.newline();
                }
            }
            (display_body?.__call__?.bind(display_body) ?? display_body)(node.body, is_toplevel, output);
        };
display_complex_body.__argnames__ = ["node", "is_toplevel", "output", "function_preamble"];
display_complex_body.__module__ = "output.statements";
undefined;

        function display_lambda_body(node, output, function_preamble) {
            if (function_preamble !== null) {
                (function_preamble?.__call__?.bind(function_preamble) ?? function_preamble)(node, output, 0);
            }
            output.indent();
            output.print("return ");
            node.body.print(output);
            output.print(";");
        };
display_lambda_body.__argnames__ = ["node", "output", "function_preamble"];
display_lambda_body.__module__ = "output.statements";
undefined;

        function print_bracketed(node, output, complex, function_preamble, before, after) {
            if (node.body.length > 0 || node.is_lambda) {
                function f() {
                    if (before) {
                        (before?.__call__?.bind(before) ?? before)(output);
                    }
                    if (node.is_lambda) {
                        (display_lambda_body?.__call__?.bind(display_lambda_body) ?? display_lambda_body)(node, output, (complex) ? function_preamble : null);
                    } else if (complex) {
                        (display_complex_body?.__call__?.bind(display_complex_body) ?? display_complex_body)(node, false, output, function_preamble);
                    } else {
                        (display_body?.__call__?.bind(display_body) ?? display_body)(node.body, false, output);
                    }
                    if (after) {
                        (after?.__call__?.bind(after) ?? after)(output);
                    }
                };
f.__module__ = "output.statements";
undefined;

                output.with_block(f);
            } else {
                if (before || after) {
                    function f() {
                        if (before) {
                            (before?.__call__?.bind(before) ?? before)(output);
                        }
                        if (after) {
                            (after?.__call__?.bind(after) ?? after)(output);
                        }
                    };
f.__module__ = "output.statements";
undefined;

                    output.with_block(f);
                } else {
                    output.print("{}");
                }
            }
        };
print_bracketed.__argnames__ = ["node", "output", "complex", "function_preamble", "before", "after"];
print_bracketed.__module__ = "output.statements";
undefined;

        function print_with(self, output) {
            var exits, clause_name, clause;
            exits = ρσ_list_decorate([]);
            [output.assign("ρσ_with_exception"), output.print("undefined"), output.end_statement()];
            var ρσ_Iter81 = self.clauses;
            ρσ_Iter81 = ((typeof ρσ_Iter81[Symbol.iterator] === "function") ? (ρσ_Iter81 instanceof Map ? ρσ_Iter81.keys() : ρσ_Iter81) : Object.keys(ρσ_Iter81));
            for (var ρσ_Index81 of ρσ_Iter81) {
                clause = ρσ_Index81;
                output.with_counter = ρσ_operator_iadd(output.with_counter, 1);
                clause_name = ρσ_operator_add("ρσ_with_clause_", output.with_counter);
                exits.push(clause_name);
                [output.indent(), output.print("var "), output.assign(clause_name)];
                clause.expression.print(output);
                output.end_statement();
                output.indent();
                if (clause.alias) {
                    output.assign(clause.alias.name);
                }
                output.print(ρσ_operator_add(clause_name, ".__enter__()"));
                output.end_statement();
            }
            [output.indent(), output.print("try"), output.space()];
            function f_body() {
                output.indent();
                self._do_print_body(output);
                output.newline();
            };
f_body.__module__ = "output.statements";
undefined;

            output.with_block(f_body);
            [output.space(), output.print("catch(e)")];
            function f_with() {
                output.indent();
                output.assign("ρσ_with_exception");
                output.print("e");
                output.end_statement();
            };
f_with.__module__ = "output.statements";
undefined;

            output.with_block(f_with);
            [output.newline(), output.indent(), output.spaced("if", "(ρσ_with_exception", "===", "undefined)")];
            function f_exit() {
                var clause;
                var ρσ_Iter82 = exits;
                ρσ_Iter82 = ((typeof ρσ_Iter82[Symbol.iterator] === "function") ? (ρσ_Iter82 instanceof Map ? ρσ_Iter82.keys() : ρσ_Iter82) : Object.keys(ρσ_Iter82));
                for (var ρσ_Index82 of ρσ_Iter82) {
                    clause = ρσ_Index82;
                    [output.indent(), output.print(ρσ_operator_add(clause, ".__exit__()")), output.end_statement()];
                }
            };
f_exit.__module__ = "output.statements";
undefined;

            output.with_block(f_exit);
            [output.space(), output.print("else"), output.space()];
            function f_suppress() {
                var clause;
                [output.indent(), output.assign("ρσ_with_suppress"), output.print("false"), output.end_statement()];
                var ρσ_Iter83 = exits;
                ρσ_Iter83 = ((typeof ρσ_Iter83[Symbol.iterator] === "function") ? (ρσ_Iter83 instanceof Map ? ρσ_Iter83.keys() : ρσ_Iter83) : Object.keys(ρσ_Iter83));
                for (var ρσ_Index83 of ρσ_Iter83) {
                    clause = ρσ_Index83;
                    output.indent();
                    output.spaced("ρσ_with_suppress", "|=", ρσ_operator_add(ρσ_operator_add("ρσ_bool(", clause), ".__exit__(ρσ_with_exception.constructor,"), "ρσ_with_exception,", "ρσ_with_exception.stack))");
                    output.end_statement();
                }
                [output.indent(), output.spaced("if", "(!ρσ_with_suppress)", "throw ρσ_with_exception"), 
                output.end_statement()];
            };
f_suppress.__module__ = "output.statements";
undefined;

            output.with_block(f_suppress);
        };
print_with.__argnames__ = ["self", "output"];
print_with.__module__ = "output.statements";
undefined;

        function print_assert(self, output) {
            if (output.options.discard_asserts) {
                return;
            }
            [output.spaced("if", "(!("), self.condition.print(output), output.spaced("))", "throw new AssertionError")];
            if (self.message) {
                output.print("(");
                self.message.print(output);
                output.print(")");
            }
            output.end_statement();
        };
print_assert.__argnames__ = ["self", "output"];
print_assert.__module__ = "output.statements";
undefined;

        ρσ_modules["output.statements"].force_statement = force_statement;
        ρσ_modules["output.statements"].first_in_statement = first_in_statement;
        ρσ_modules["output.statements"].declare_vars = declare_vars;
        ρσ_modules["output.statements"].display_body = display_body;
        ρσ_modules["output.statements"].display_complex_body = display_complex_body;
        ρσ_modules["output.statements"].display_lambda_body = display_lambda_body;
        ρσ_modules["output.statements"].print_bracketed = print_bracketed;
        ρσ_modules["output.statements"].print_with = print_with;
        ρσ_modules["output.statements"].print_assert = print_assert;
    })();

    (function(){
        var __name__ = "output.exceptions";
        var print_bracketed = ρσ_modules["output.statements"].print_bracketed;

        function print_try(self, output) {
            var else_var_name;
            else_var_name = null;
            function update_output_var(output) {
                [output.indent(), output.assign(else_var_name), output.print("true"), output.end_statement()];
            };
update_output_var.__argnames__ = ["output"];
update_output_var.__module__ = "output.exceptions";
undefined;

            if (self.belse) {
                else_var_name = output.new_try_else_counter();
                [output.assign(ρσ_operator_add("var ", else_var_name)), output.print("false"), output.end_statement(), 
                output.indent()];
            }
            output.print("try");
            output.space();
            (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output, false, null, null, (else_var_name) ? update_output_var : null);
            if (self.bcatch) {
                output.space();
                (print_catch?.__call__?.bind(print_catch) ?? print_catch)(self.bcatch, output);
            }
            if (self.bfinally) {
                output.space();
                (print_finally?.__call__?.bind(print_finally) ?? print_finally)(self.bfinally, output, self.belse, else_var_name);
            } else if (self.belse) {
                output.newline();
                (print_else?.__call__?.bind(print_else) ?? print_else)(self.belse, else_var_name, output);
            }
        };
print_try.__argnames__ = ["self", "output"];
print_try.__module__ = "output.exceptions";
undefined;

        function print_catch(self, output) {
            output.print("catch");
            output.space();
            output.with_parens((function() {
                var ρσ_anonfunc = function () {
                    return output.print("ρσ_Exception");                };
ρσ_anonfunc.__module__ = "output.exceptions";
undefined;
                return ρσ_anonfunc;
            })());
            output.space();
            function f_exception() {
                var no_default, ρσ_unpack, i, exception;
                output.indent();
                [output.spaced("ρσ_last_exception", "=", "ρσ_Exception"), output.end_statement()];
                output.indent();
                no_default = true;
                var ρσ_Iter84 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.body);
                ρσ_Iter84 = ((typeof ρσ_Iter84[Symbol.iterator] === "function") ? (ρσ_Iter84 instanceof Map ? ρσ_Iter84.keys() : ρσ_Iter84) : Object.keys(ρσ_Iter84));
                for (var ρσ_Index84 of ρσ_Iter84) {
                    ρσ_unpack = ρσ_Index84;
                    i = ρσ_unpack[0];
                    exception = ρσ_unpack[1];
                    if (i) {
                        output.print("else ");
                    }
                    if (exception.errors.length) {
                        output.print("if");
                        output.space();
                        function f_errors() {
                            var ρσ_unpack, i, err;
                            var ρσ_Iter85 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(exception.errors);
                            ρσ_Iter85 = ((typeof ρσ_Iter85[Symbol.iterator] === "function") ? (ρσ_Iter85 instanceof Map ? ρσ_Iter85.keys() : ρσ_Iter85) : Object.keys(ρσ_Iter85));
                            for (var ρσ_Index85 of ρσ_Iter85) {
                                ρσ_unpack = ρσ_Index85;
                                i = ρσ_unpack[0];
                                err = ρσ_unpack[1];
                                if (i) {
                                    output.newline();
                                    output.indent();
                                    output.print("||");
                                    output.space();
                                }
                                output.print("ρσ_Exception");
                                output.space();
                                output.print("instanceof");
                                output.space();
                                if (err.name === "Exception") {
                                    output.print("Error");
                                } else {
                                    err.print(output);
                                }
                            }
                        };
f_errors.__module__ = "output.exceptions";
undefined;

                        output.with_parens(f_errors);
                        output.space();
                    } else {
                        no_default = false;
                    }
                    (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(exception, output, true);
                    output.space();
                }
                if (no_default) {
                    output.print("else");
                    output.space();
                    function f_throw() {
                        output.indent();
                        output.print("throw");
                        output.space();
                        output.print("ρσ_Exception");
                        output.semicolon();
                        output.newline();
                    };
f_throw.__module__ = "output.exceptions";
undefined;

                    output.with_block(f_throw);
                }
                output.newline();
            };
f_exception.__module__ = "output.exceptions";
undefined;

            output.with_block(f_exception);
        };
print_catch.__argnames__ = ["self", "output"];
print_catch.__module__ = "output.exceptions";
undefined;

        function print_finally(self, output, belse, else_var_name) {
            output.print("finally");
            output.space();
            if (else_var_name) {
                function f_try() {
                    [output.indent(), output.print("try")];
                    output.space();
                    output.with_block((function() {
                        var ρσ_anonfunc = function () {
                            return (print_else?.__call__?.bind(print_else) ?? print_else)(belse, else_var_name, output);                        };
ρσ_anonfunc.__module__ = "output.exceptions";
undefined;
                        return ρσ_anonfunc;
                    })());
                    (print_finally?.__call__?.bind(print_finally) ?? print_finally)(self, output);
                };
f_try.__module__ = "output.exceptions";
undefined;

                output.with_block(f_try);
            } else {
                (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output);
            }
        };
print_finally.__argnames__ = ["self", "output", "belse", "else_var_name"];
print_finally.__module__ = "output.exceptions";
undefined;

        function print_else(self, else_var_name, output) {
            [output.indent(), output.spaced("if", ρσ_operator_add(ρσ_operator_add("(", else_var_name), ")"))];
            output.space();
            (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output);
        };
print_else.__argnames__ = ["self", "else_var_name", "output"];
print_else.__module__ = "output.exceptions";
undefined;

        ρσ_modules["output.exceptions"].print_try = print_try;
        ρσ_modules["output.exceptions"].print_catch = print_catch;
        ρσ_modules["output.exceptions"].print_finally = print_finally;
        ρσ_modules["output.exceptions"].print_else = print_else;
    })();

    (function(){
        var __name__ = "output.utils";
        var AST_BlockStatement = ρσ_modules.ast_types.AST_BlockStatement;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        function best_of(a) {
            var best, len_, i;
            best = a[0];
            len_ = best.length;
            for (var ρσ_Index86 = 1; ρσ_Index86 < a.length; ρσ_Index86++) {
                i = ρσ_Index86;
                if (a[(typeof i === "number" && i < 0) ? a.length + i : i].length < len_) {
                    best = a[(typeof i === "number" && i < 0) ? a.length + i : i];
                    len_ = best.length;
                }
            }
            return best;
        };
best_of.__argnames__ = ["a"];
best_of.__module__ = "output.utils";
undefined;

        function make_num(num) {
            var str_, a, m;
            str_ = num.toString(10);
            a = ρσ_list_decorate([ str_.replace(new RegExp("^0\\."), ".").replace("e+", "e") ]);
            m = null;
            if (Math.floor(num) === num) {
                if (num >= 0) {
                    a.push(ρσ_operator_add("0x", num.toString(16).toLowerCase()), ρσ_operator_add("0", num.toString(8)));
                } else {
                    a.push(ρσ_operator_add("-0x", (-(num)).toString(16).toLowerCase()), ρσ_operator_add("-0", (-(num)).toString(8)));
                }
                m = new RegExp("^(.*?)(0+)$").exec(num);
                if (m) {
                    a.push(ρσ_operator_add(ρσ_operator_add(m[1], "e"), m[2].length));
                }
            } else {
                m = new RegExp("^0?\\.(0+)(.*)$").exec(num);
                if (m) {
                    a.push(ρσ_operator_add(ρσ_operator_add(m[2], "e-"), (ρσ_operator_add(m[1].length, m[2].length))), str_.substr(str_.indexOf(".")));
                }
            }
            return (best_of?.__call__?.bind(best_of) ?? best_of)(a);
        };
make_num.__argnames__ = ["num"];
make_num.__module__ = "output.utils";
undefined;

        function make_block(stmt, output) {
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_BlockStatement)) {
                stmt.print(output);
                return;
            }
            function print_statement() {
                output.indent();
                stmt.print(output);
                output.newline();
            };
print_statement.__module__ = "output.utils";
undefined;

            output.with_block(print_statement);
        };
make_block.__argnames__ = ["stmt", "output"];
make_block.__module__ = "output.utils";
undefined;

        function create_doctring(docstrings) {
            var ans, ds, lines, min_leading_whitespace, r, leading_whitespace, line, lw, ρσ_unpack, l;
            ans = ρσ_list_decorate([]);
            var ρσ_Iter87 = docstrings;
            ρσ_Iter87 = ((typeof ρσ_Iter87[Symbol.iterator] === "function") ? (ρσ_Iter87 instanceof Map ? ρσ_Iter87.keys() : ρσ_Iter87) : Object.keys(ρσ_Iter87));
            for (var ρσ_Index87 of ρσ_Iter87) {
                ds = ρσ_Index87;
                ds = str.rstrip(ds.value);
                lines = ρσ_list_decorate([]);
                min_leading_whitespace = "";
                var ρσ_Iter88 = ds.split(new RegExp("$", "gm"));
                ρσ_Iter88 = ((typeof ρσ_Iter88[Symbol.iterator] === "function") ? (ρσ_Iter88 instanceof Map ? ρσ_Iter88.keys() : ρσ_Iter88) : Object.keys(ρσ_Iter88));
                for (var ρσ_Index88 of ρσ_Iter88) {
                    line = ρσ_Index88;
                    r = new RegExp("^\\s+").exec(line);
                    leading_whitespace = "";
                    if (r) {
                        leading_whitespace = (r) ? r[0].replace(new RegExp("[\\n\\r]", "g"), "") : "";
                        line = line.slice(r[0].length);
                    }
                    if (!str.strip(line)) {
                        lines.push(ρσ_list_decorate([ "", "" ]));
                    } else {
                        leading_whitespace = leading_whitespace.replace(new RegExp("\\t", "g"), "    ");
                        if (leading_whitespace && (!min_leading_whitespace || leading_whitespace.length < min_leading_whitespace.length)) {
                            min_leading_whitespace = leading_whitespace;
                        }
                        lines.push(ρσ_list_decorate([ leading_whitespace, line ]));
                    }
                }
                var ρσ_Iter89 = lines;
                ρσ_Iter89 = ((typeof ρσ_Iter89[Symbol.iterator] === "function") ? (ρσ_Iter89 instanceof Map ? ρσ_Iter89.keys() : ρσ_Iter89) : Object.keys(ρσ_Iter89));
                for (var ρσ_Index89 of ρσ_Iter89) {
                    ρσ_unpack = ρσ_Index89;
                    lw = ρσ_unpack[0];
                    l = ρσ_unpack[1];
                    if (min_leading_whitespace) {
                        lw = lw.slice(min_leading_whitespace.length);
                    }
                    ans.push(ρσ_operator_add(lw, l));
                }
                ans.push("");
            }
            return str.rstrip(ans.join("\n"));
        };
create_doctring.__argnames__ = ["docstrings"];
create_doctring.__module__ = "output.utils";
undefined;

        ρσ_modules["output.utils"].best_of = best_of;
        ρσ_modules["output.utils"].make_num = make_num;
        ρσ_modules["output.utils"].make_block = make_block;
        ρσ_modules["output.utils"].create_doctring = create_doctring;
    })();

    (function(){
        var __name__ = "output.loops";
        var AST_BaseCall = ρσ_modules.ast_types.AST_BaseCall;
        var AST_SymbolRef = ρσ_modules.ast_types.AST_SymbolRef;
        var AST_Array = ρσ_modules.ast_types.AST_Array;
        var AST_Unary = ρσ_modules.ast_types.AST_Unary;
        var AST_Number = ρσ_modules.ast_types.AST_Number;
        var has_calls = ρσ_modules.ast_types.has_calls;
        var AST_Seq = ρσ_modules.ast_types.AST_Seq;
        var AST_ListComprehension = ρσ_modules.ast_types.AST_ListComprehension;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        var OutputStream = ρσ_modules["output.stream"].OutputStream;

        function unpack_tuple(elems, output, in_statement) {
            var ρσ_unpack, i, elem;
            var ρσ_Iter90 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(elems);
            ρσ_Iter90 = ((typeof ρσ_Iter90[Symbol.iterator] === "function") ? (ρσ_Iter90 instanceof Map ? ρσ_Iter90.keys() : ρσ_Iter90) : Object.keys(ρσ_Iter90));
            for (var ρσ_Index90 of ρσ_Iter90) {
                ρσ_unpack = ρσ_Index90;
                i = ρσ_unpack[0];
                elem = ρσ_unpack[1];
                output.indent();
                output.assign(elem);
                output.print("ρσ_unpack");
                output.with_square((function() {
                    var ρσ_anonfunc = function () {
                        return output.print(i);                    };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                    return ρσ_anonfunc;
                })());
                if (!in_statement || i < ρσ_operator_sub(elems.length, 1)) {
                    output.semicolon();
                    output.newline();
                }
            }
        };
unpack_tuple.__argnames__ = ["elems", "output", "in_statement"];
unpack_tuple.__module__ = "output.loops";
undefined;

        function print_do_loop(self, output) {
            output.print("do");
            output.space();
            self._do_print_body(output);
            output.space();
            output.print("while");
            output.space();
            output.with_parens((function() {
                var ρσ_anonfunc = function () {
                    return self.condition.print(output);                };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                return ρσ_anonfunc;
            })());
            output.semicolon();
        };
print_do_loop.__argnames__ = ["self", "output"];
print_do_loop.__module__ = "output.loops";
undefined;

        function print_while_loop(self, output) {
            output.print("while");
            output.space();
            output.with_parens((function() {
                var ρσ_anonfunc = function () {
                    return self.condition.print(output);                };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                return ρσ_anonfunc;
            })());
            output.space();
            self._do_print_body(output);
        };
print_while_loop.__argnames__ = ["self", "output"];
print_while_loop.__module__ = "output.loops";
undefined;

        function is_simple_for_in(self) {
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.object, AST_BaseCall) && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.object.expression, AST_SymbolRef) && self.object.expression.name === "dir" && self.object.args.length === 1) {
                return true;
            }
            return false;
        };
is_simple_for_in.__argnames__ = ["self"];
is_simple_for_in.__module__ = "output.loops";
undefined;

        function is_simple_for(self) {
            var a, l;
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.object, AST_BaseCall) && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.object.expression, AST_SymbolRef) && self.object.expression.name === "range" && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.init, AST_Array))) {
                a = self.object.args;
                l = a.length;
                if (l < 3 || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(a[2], AST_Number) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(a[2], AST_Unary) && a[2].operator === "-" && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(a[2].expression, AST_Number)) {
                    if (l === 1 && !(has_calls?.__call__?.bind(has_calls) ?? has_calls)(a[0]) || l > 1 && !(has_calls?.__call__?.bind(has_calls) ?? has_calls)(a[1])) {
                        return true;
                    }
                }
            }
            return false;
        };
is_simple_for.__argnames__ = ["self"];
is_simple_for.__module__ = "output.loops";
undefined;

        function print_for_loop_body(output) {
            var self;
            self = this;
            function f_print_for_loop_body() {
                var itervar, flat, stmt;
                if (!((self.simple_for_index || (is_simple_for_in?.__call__?.bind(is_simple_for_in) ?? is_simple_for_in)(self)))) {
                    output.indent();
                    itervar = ρσ_operator_add("ρσ_Index", output.index_counter);
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.init, AST_Array)) {
                        flat = self.init.flatten();
                        output.assign("ρσ_unpack");
                        if (flat.length > self.init.elements.length) {
                            output.print(ρσ_operator_add(ρσ_operator_add("ρσ_flatten(", itervar), ")"));
                        } else {
                            output.print(itervar);
                        }
                        output.end_statement();
                        (unpack_tuple?.__call__?.bind(unpack_tuple) ?? unpack_tuple)(flat, output);
                    } else {
                        output.assign(self.init);
                        output.print(itervar);
                        output.end_statement();
                    }
                    output.index_counter = ρσ_operator_iadd(output.index_counter, 1);
                }
                if (self.simple_for_index) {
                    output.indent();
                    output.assign(self.init);
                    output.print(self.simple_for_index);
                    output.end_statement();
                }
                var ρσ_Iter91 = self.body.body;
                ρσ_Iter91 = ((typeof ρσ_Iter91[Symbol.iterator] === "function") ? (ρσ_Iter91 instanceof Map ? ρσ_Iter91.keys() : ρσ_Iter91) : Object.keys(ρσ_Iter91));
                for (var ρσ_Index91 of ρσ_Iter91) {
                    stmt = ρσ_Index91;
                    output.indent();
                    stmt.print(output);
                    output.newline();
                }
            };
f_print_for_loop_body.__module__ = "output.loops";
undefined;

            output.with_block(f_print_for_loop_body);
        };
print_for_loop_body.__argnames__ = ["output"];
print_for_loop_body.__module__ = "output.loops";
undefined;

        function init_es6_itervar(output, itervar) {
            output.indent();
            output.spaced(itervar, "=", "((typeof", ρσ_operator_add(itervar, "[Symbol.iterator]"), "===", "\"function\")", "?", ρσ_operator_add("(", itervar), "instanceof", "Map", "?", ρσ_operator_add(itervar, ".keys()"), ":", ρσ_operator_add(itervar, ")"), ":", ρσ_operator_add(ρσ_operator_add("Object.keys(", itervar), "))"));
            output.end_statement();
        };
init_es6_itervar.__argnames__ = ["output", "itervar"];
init_es6_itervar.__module__ = "output.loops";
undefined;

        function print_for_in(self, output) {
            var increment, args, tmp_, start, end, idx, itervar;
            function write_object() {
                if (self.object.constructor === AST_Seq) {
                    new AST_Array({"elements":self.object.to_array()}).print(output);
                } else {
                    self.object.print(output);
                }
            };
write_object.__module__ = "output.loops";
undefined;

            if ((is_simple_for?.__call__?.bind(is_simple_for) ?? is_simple_for)(self)) {
                increment = null;
                args = self.object.args;
                tmp_ = args.length;
                if (tmp_ === 1) {
                    start = 0;
                    end = args[0];
                } else if (tmp_ === 2) {
                    start = args[0];
                    end = args[1];
                } else if (tmp_ === 3) {
                    start = args[0];
                    end = args[1];
                    increment = args[2];
                }
                self.simple_for_index = idx = ρσ_operator_add("ρσ_Index", output.index_counter);
                output.index_counter = ρσ_operator_iadd(output.index_counter, 1);
                output.print("for");
                output.space();
                function f_simple_for() {
                    [output.spaced("var", idx, "="), output.space()];
                    (start.print) ? start.print(output) : output.print(start);
                    output.semicolon();
                    output.space();
                    output.print(idx);
                    output.space();
                    ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(increment, AST_Unary)) ? output.print(">") : output.print("<");
                    output.space();
                    end.print(output);
                    output.semicolon();
                    output.space();
                    output.print(idx);
                    if (increment && (!((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(increment, AST_Unary)) || increment.expression.value !== "1")) {
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(increment, AST_Unary)) {
                            output.print("-=");
                            increment.expression.print(output);
                        } else {
                            output.print("+=");
                            increment.print(output);
                        }
                    } else {
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(increment, AST_Unary)) {
                            output.print("--");
                        } else {
                            output.print("++");
                        }
                    }
                };
f_simple_for.__module__ = "output.loops";
undefined;

                output.with_parens(f_simple_for);
            } else if ((is_simple_for_in?.__call__?.bind(is_simple_for_in) ?? is_simple_for_in)(self)) {
                output.print("for");
                output.space();
                function f_simple_for_in() {
                    self.init.print(output);
                    output.space();
                    output.print("in");
                    output.space();
                    self.object.args[0].print(output);
                };
f_simple_for_in.__module__ = "output.loops";
undefined;

                output.with_parens(f_simple_for_in);
            } else {
                itervar = ρσ_operator_add("ρσ_Iter", output.index_counter);
                output.assign(ρσ_operator_add("var ", itervar));
                (write_object?.__call__?.bind(write_object) ?? write_object)();
                output.end_statement();
                (init_es6_itervar?.__call__?.bind(init_es6_itervar) ?? init_es6_itervar)(output, itervar);
                output.indent();
                output.spaced("for", "(var", ρσ_operator_add("ρσ_Index", output.index_counter), "of", ρσ_operator_add(itervar, ")"));
            }
            output.space();
            self._do_print_body(output);
        };
print_for_in.__argnames__ = ["self", "output"];
print_for_in.__module__ = "output.loops";
undefined;

        function print_list_comprehension(self, output) {
            var tname, result_obj, is_generator, add_to_result, push_func;
            tname = self.constructor.name.slice(4);
            result_obj = (ρσ_expr_temp = {"ListComprehension":"[]","DictComprehension":(self.is_jshash) ? "Object.create(null)" : "{}","SetComprehension":"ρσ_set()"})[(typeof tname === "number" && tname < 0) ? ρσ_expr_temp.length + tname : tname];
            is_generator = tname === "GeneratorComprehension";
            add_to_result = null;
            if (tname === "DictComprehension") {
                if (self.is_pydict) {
                    result_obj = "ρσ_dict()";
                    function add_to_result0(output) {
                        output.indent();
                        output.print("ρσ_Result.set");
                        function f_dict() {
                            self.statement.print(output);
                            output.space();
                            output.print(",");
                            output.space();
                            function f_dict0() {
                                if (self.value_statement.constructor === AST_Seq) {
                                    output.with_square((function() {
                                        var ρσ_anonfunc = function () {
                                            return self.value_statement.print(output);                                        };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                                        return ρσ_anonfunc;
                                    })());
                                } else {
                                    self.value_statement.print(output);
                                }
                            };
f_dict0.__module__ = "output.loops";
undefined;

                            output.with_parens(f_dict0);
                        };
f_dict.__module__ = "output.loops";
undefined;

                        output.with_parens(f_dict);
                        output.end_statement();
                    };
add_to_result0.__argnames__ = ["output"];
add_to_result0.__module__ = "output.loops";
undefined;

                    add_to_result = add_to_result0;
                } else {
                    function add_to_result0(output) {
                        output.indent();
                        output.print("ρσ_Result");
                        output.with_square((function() {
                            var ρσ_anonfunc = function () {
                                return self.statement.print(output);                            };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                            return ρσ_anonfunc;
                        })());
                        [output.space(), output.print("="), output.space()];
                        function f_result() {
                            if (self.value_statement.constructor === AST_Seq) {
                                output.with_square((function() {
                                    var ρσ_anonfunc = function () {
                                        return self.value_statement.print(output);                                    };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                                    return ρσ_anonfunc;
                                })());
                            } else {
                                self.value_statement.print(output);
                            }
                        };
f_result.__module__ = "output.loops";
undefined;

                        output.with_parens(f_result);
                        output.end_statement();
                    };
add_to_result0.__argnames__ = ["output"];
add_to_result0.__module__ = "output.loops";
undefined;

                    add_to_result = add_to_result0;
                }
            } else {
                push_func = ρσ_operator_add("ρσ_Result.", ((self.constructor === AST_ListComprehension) ? "push" : "add"));
                if (is_generator) {
                    push_func = "yield ";
                }
                function add_to_result0(output) {
                    output.indent();
                    output.print(push_func);
                    function f_output_statement() {
                        if (self.statement.constructor === AST_Seq) {
                            output.with_square((function() {
                                var ρσ_anonfunc = function () {
                                    return self.statement.print(output);                                };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                                return ρσ_anonfunc;
                            })());
                        } else {
                            self.statement.print(output);
                        }
                    };
f_output_statement.__module__ = "output.loops";
undefined;

                    output.with_parens(f_output_statement);
                    output.end_statement();
                };
add_to_result0.__argnames__ = ["output"];
add_to_result0.__module__ = "output.loops";
undefined;

                add_to_result = add_to_result0;
            }
            function f_body() {
                output.print("function");
                output.print("()");
                output.space();
                function f_body0() {
                    var body_out, previous_indentation, i;
                    body_out = output;
                    if (is_generator) {
                        body_out.indent();
                        [body_out.print("function* js_generator()"), body_out.space(), body_out.print("{")];
                        body_out.newline();
                        previous_indentation = output.indentation();
                        output.set_indentation(output.next_indent());
                    }
                    body_out.indent();
                    body_out.assign("var ρσ_Iter");
                    self.object.print(body_out);
                    if (result_obj) {
                        body_out.comma();
                        body_out.assign("ρσ_Result");
                        body_out.print(result_obj);
                    }
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.init, AST_Array)) {
                        var ρσ_Iter92 = self.init.elements;
                        ρσ_Iter92 = ((typeof ρσ_Iter92[Symbol.iterator] === "function") ? (ρσ_Iter92 instanceof Map ? ρσ_Iter92.keys() : ρσ_Iter92) : Object.keys(ρσ_Iter92));
                        for (var ρσ_Index92 of ρσ_Iter92) {
                            i = ρσ_Index92;
                            body_out.comma();
                            i.print(body_out);
                        }
                    } else {
                        body_out.comma();
                        self.init.print(body_out);
                    }
                    body_out.end_statement();
                    (init_es6_itervar?.__call__?.bind(init_es6_itervar) ?? init_es6_itervar)(body_out, "ρσ_Iter");
                    body_out.indent();
                    body_out.print("for");
                    body_out.space();
                    body_out.with_parens((function() {
                        var ρσ_anonfunc = function () {
                            return body_out.spaced("var", "ρσ_Index", "of", "ρσ_Iter");                        };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                        return ρσ_anonfunc;
                    })());
                    body_out.space();
                    function f_body_out() {
                        var itervar, flat;
                        body_out.indent();
                        itervar = "ρσ_Index";
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.init, AST_Array)) {
                            flat = self.init.flatten();
                            body_out.assign("ρσ_unpack");
                            if (flat.length > self.init.elements.length) {
                                body_out.print(ρσ_operator_add(ρσ_operator_add("ρσ_flatten(", itervar), ")"));
                            } else {
                                body_out.print(itervar);
                            }
                            body_out.end_statement();
                            (unpack_tuple?.__call__?.bind(unpack_tuple) ?? unpack_tuple)(flat, body_out);
                        } else {
                            body_out.assign(self.init);
                            body_out.print(itervar);
                            body_out.end_statement();
                        }
                        if (self.condition) {
                            body_out.indent();
                            body_out.print("if");
                            body_out.space();
                            body_out.with_parens((function() {
                                var ρσ_anonfunc = function () {
                                    return self.condition.print(body_out);                                };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                                return ρσ_anonfunc;
                            })());
                            body_out.space();
                            body_out.with_block((function() {
                                var ρσ_anonfunc = function () {
                                    return (add_to_result?.__call__?.bind(add_to_result) ?? add_to_result)(body_out);                                };
ρσ_anonfunc.__module__ = "output.loops";
undefined;
                                return ρσ_anonfunc;
                            })());
                            body_out.newline();
                        } else {
                            (add_to_result?.__call__?.bind(add_to_result) ?? add_to_result)(body_out);
                        }
                    };
f_body_out.__module__ = "output.loops";
undefined;

                    body_out.with_block(f_body_out);
                    body_out.newline();
                    if (self.constructor === AST_ListComprehension) {
                        body_out.indent();
                        body_out.spaced("ρσ_Result", "=", "ρσ_list_constructor(ρσ_Result)");
                        body_out.end_statement();
                    }
                    if (!is_generator) {
                        body_out.indent();
                        body_out.print("return ρσ_Result");
                        body_out.end_statement();
                    }
                    if (is_generator) {
                        output.set_indentation(previous_indentation);
                        [body_out.newline(), body_out.indent(), body_out.print("}")];
                        [output.newline(), output.indent()];
                        output.spaced("var", "result", "=", "js_generator.call(this)");
                        output.end_statement();
                        output.indent();
                        output.spaced("result.send", "=", "result.next");
                        output.end_statement();
                        output.indent();
                        output.spaced("return", "result");
                        output.end_statement();
                    }
                };
f_body0.__module__ = "output.loops";
undefined;

                output.with_block(f_body0);
            };
f_body.__module__ = "output.loops";
undefined;

            output.with_parens(f_body);
            output.print("()");
        };
print_list_comprehension.__argnames__ = ["self", "output"];
print_list_comprehension.__module__ = "output.loops";
undefined;

        function print_ellipses_range(self, output) {
            output.print("ρσ_range(");
            self.first.print(output);
            output.print(",(");
            self.last.print(output);
            output.print("+1))");
        };
print_ellipses_range.__argnames__ = ["self", "output"];
print_ellipses_range.__module__ = "output.loops";
undefined;

        ρσ_modules["output.loops"].unpack_tuple = unpack_tuple;
        ρσ_modules["output.loops"].print_do_loop = print_do_loop;
        ρσ_modules["output.loops"].print_while_loop = print_while_loop;
        ρσ_modules["output.loops"].is_simple_for_in = is_simple_for_in;
        ρσ_modules["output.loops"].is_simple_for = is_simple_for;
        ρσ_modules["output.loops"].print_for_loop_body = print_for_loop_body;
        ρσ_modules["output.loops"].init_es6_itervar = init_es6_itervar;
        ρσ_modules["output.loops"].print_for_in = print_for_in;
        ρσ_modules["output.loops"].print_list_comprehension = print_list_comprehension;
        ρσ_modules["output.loops"].print_ellipses_range = print_ellipses_range;
    })();

    (function(){
        var __name__ = "output.operators";
        var comparators, function_ops, after_map;
        var AST_Array = ρσ_modules.ast_types.AST_Array;
        var AST_Assign = ρσ_modules.ast_types.AST_Assign;
        var AST_BaseCall = ρσ_modules.ast_types.AST_BaseCall;
        var AST_Binary = ρσ_modules.ast_types.AST_Binary;
        var AST_Conditional = ρσ_modules.ast_types.AST_Conditional;
        var AST_ItemAccess = ρσ_modules.ast_types.AST_ItemAccess;
        var AST_Number = ρσ_modules.ast_types.AST_Number;
        var AST_Object = ρσ_modules.ast_types.AST_Object;
        var AST_Return = ρσ_modules.ast_types.AST_Return;
        var AST_Seq = ρσ_modules.ast_types.AST_Seq;
        var AST_Set = ρσ_modules.ast_types.AST_Set;
        var AST_SimpleStatement = ρσ_modules.ast_types.AST_SimpleStatement;
        var AST_Statement = ρσ_modules.ast_types.AST_Statement;
        var AST_String = ρσ_modules.ast_types.AST_String;
        var AST_Sub = ρσ_modules.ast_types.AST_Sub;
        var AST_Symbol = ρσ_modules.ast_types.AST_Symbol;
        var AST_SymbolRef = ρσ_modules.ast_types.AST_SymbolRef;
        var AST_Unary = ρσ_modules.ast_types.AST_Unary;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        var unpack_tuple = ρσ_modules["output.loops"].unpack_tuple;

        function print_getattr(self, output, skip_expression) {
            var expr;
            if (!skip_expression) {
                expr = self.expression;
                expr.print(output);
            }
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_Number) && expr.value >= 0) {
                if (!new RegExp("[xa-f.]", "i").test(output.last())) {
                    output.print(".");
                }
            }
            output.print(".");
            output.print_name(self.property);
        };
print_getattr.__argnames__ = ["self", "output", "skip_expression"];
print_getattr.__module__ = "output.operators";
undefined;

        function print_getitem(self, output) {
            var expr, prop, is_negative_number, is_repeatable;
            expr = self.expression;
            prop = self.property;
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop, AST_Number) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop, AST_String) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop, AST_SymbolRef) && prop.name && prop.name.startsWith("ρσ_")) {
                expr.print(output);
                [output.print("["), prop.print(output), output.print("]")];
                return;
            }
            is_negative_number = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop, AST_Unary) && prop.operator === "-" && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop.expression, AST_Number);
            is_repeatable = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expr, AST_SymbolRef);
            if (is_repeatable) {
                expr.print(output);
            } else {
                [output.spaced("(ρσ_expr_temp", "=", expr), output.print(")")];
                expr = {"print":(function() {
                    var ρσ_anonfunc = function () {
                        return output.print("ρσ_expr_temp");                    };
ρσ_anonfunc.__module__ = "output.operators";
undefined;
                    return ρσ_anonfunc;
                })()};
            }
            if (is_negative_number) {
                [output.print("["), expr.print(output), output.print(".length"), prop.print(output), 
                output.print("]")];
                return;
            }
            is_repeatable = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop, AST_SymbolRef);
            if (is_repeatable) {
                output.spaced("[(typeof", prop, "===", "\"number\"", "&&", prop);
                [output.spaced("", "<", "0)", "?", expr), output.spaced(".length", "+", prop, ":", prop)];
                output.print("]");
            } else {
                [output.print("[ρσ_bound_index("), prop.print(output), output.comma(), expr.print(output), 
                output.print(")]")];
            }
        };
print_getitem.__argnames__ = ["self", "output"];
print_getitem.__module__ = "output.operators";
undefined;

        function print_rich_getitem(self, output) {
            var func;
            func = ρσ_operator_add("ρσ_", ((self.assignment) ? "setitem" : "getitem"));
            output.print(ρσ_operator_add(func, "("));
            [self.expression.print(output), output.comma(), self.property.print(output)];
            if (self.assignment) {
                [output.comma(), self.assignment.print(output)];
            }
            output.print(")");
        };
print_rich_getitem.__argnames__ = ["self", "output"];
print_rich_getitem.__module__ = "output.operators";
undefined;

        function print_splice_assignment(self, output) {
            output.print("ρσ_splice(");
            [self.expression.print(output), output.comma(), self.assignment.print(output), output.comma()];
            (self.property) ? self.property.print(output) : output.print("0");
            if (self.property2) {
                output.comma();
                self.property2.print(output);
            }
            output.print(")");
        };
print_splice_assignment.__argnames__ = ["self", "output"];
print_splice_assignment.__module__ = "output.operators";
undefined;

        function print_delete(self, output) {
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_Symbol)) {
                [output.assign(self), output.print("undefined")];
            } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_Sub) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_ItemAccess)) {
                [output.print("ρσ_delitem("), self.expression.print(output), output.comma(), self.property.print(output), 
                output.print(")")];
            } else {
                output.spaced("delete", self);
            }
        };
print_delete.__argnames__ = ["self", "output"];
print_delete.__module__ = "output.operators";
undefined;

        function print_unary_prefix(self, output) {
            var op;
            op = self.operator;
            if (op === "delete") {
                return (print_delete?.__call__?.bind(print_delete) ?? print_delete)(self.expression, output);
            }
            output.print(op);
            if (new RegExp("^[a-z]", "i").test(op)) {
                output.space();
            }
            if (self.parenthesized) {
                output.with_parens((function() {
                    var ρσ_anonfunc = function () {
                        return self.expression.print(output);                    };
ρσ_anonfunc.__module__ = "output.operators";
undefined;
                    return ρσ_anonfunc;
                })());
            } else {
                self.expression.print(output);
            }
        };
print_unary_prefix.__argnames__ = ["self", "output"];
print_unary_prefix.__module__ = "output.operators";
undefined;

        function write_instanceof(left, right, output) {
            function do_many(vals) {
                var i;
                [output.print("ρσ_instanceof.apply(null,"), output.space()];
                [output.print("["), left.print(output), output.comma()];
                var ρσ_Iter93 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(vals));
                ρσ_Iter93 = ((typeof ρσ_Iter93[Symbol.iterator] === "function") ? (ρσ_Iter93 instanceof Map ? ρσ_Iter93.keys() : ρσ_Iter93) : Object.keys(ρσ_Iter93));
                for (var ρσ_Index93 of ρσ_Iter93) {
                    i = ρσ_Index93;
                    vals[(typeof i === "number" && i < 0) ? vals.length + i : i].print(output);
                    if (i !== ρσ_operator_sub(vals.length, 1)) {
                        output.comma();
                    }
                }
                output.print("])");
            };
do_many.__argnames__ = ["vals"];
do_many.__module__ = "output.operators";
undefined;

            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right, AST_Seq)) {
                (do_many?.__call__?.bind(do_many) ?? do_many)(right.to_array());
            } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(right, AST_Array)) {
                (do_many?.__call__?.bind(do_many) ?? do_many)(right.elements);
            } else {
                output.print("ρσ_instanceof(");
                [left.print(output), output.comma(), right.print(output), output.print(")")];
            }
        };
write_instanceof.__argnames__ = ["left", "right", "output"];
write_instanceof.__module__ = "output.operators";
undefined;

        function write_smart_equality(self, output) {
            function is_ok(x) {
                return !(((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Array) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Set) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Object) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Statement) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Binary) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_Conditional) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_BaseCall) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(x, AST_SymbolRef)));
            };
is_ok.__argnames__ = ["x"];
is_ok.__module__ = "output.operators";
undefined;

            if ((is_ok?.__call__?.bind(is_ok) ?? is_ok)(self.left) && (is_ok?.__call__?.bind(is_ok) ?? is_ok)(self.right)) {
                if (self.operator === "==") {
                    output.print("(");
                    output.spaced(self.left, "===", self.right, "||", "typeof", self.left, "===", "\"object\"", "&&", "ρσ_equals(");
                    [self.left.print(output), output.print(","), output.space(), self.right.print(output), 
                    output.print("))")];
                } else {
                    output.print("(");
                    output.spaced(self.left, "!==", self.right, "&&", "(typeof", self.left, "!==", "\"object\"", "||", "ρσ_not_equals(");
                    [self.left.print(output), output.print(","), output.space(), self.right.print(output), 
                    output.print(")))")];
                }
            } else {
                output.print(ρσ_operator_add("ρσ_", ((self.operator === "==") ? "equals(" : "not_equals(")));
                [self.left.print(output), output.print(","), output.space(), self.right.print(output), 
                output.print(")")];
            }
        };
write_smart_equality.__argnames__ = ["self", "output"];
write_smart_equality.__module__ = "output.operators";
undefined;

        comparators = {"<":true,">":true,"<=":true,">=":true};
        function_ops = {"in":"ρσ_in","nin":"!ρσ_in"};
        function print_binary_op(self, output) {
            var leftvar, left, nan_check;
            if (function_ops[ρσ_bound_index(self.operator, function_ops)]) {
                output.print(function_ops[ρσ_bound_index(self.operator, function_ops)]);
                function f_comma() {
                    self.left.print(output);
                    output.comma();
                    self.right.print(output);
                };
f_comma.__module__ = "output.operators";
undefined;

                output.with_parens(f_comma);
            } else if (comparators[ρσ_bound_index(self.operator, comparators)] && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.left, AST_Binary) && comparators[ρσ_bound_index(self.left.operator, comparators)]) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.left.right, AST_Symbol)) {
                    self.left.print(output);
                    leftvar = self.left.right.name;
                } else {
                    self.left.left.print(output);
                    output.space();
                    output.print(self.left.operator);
                    output.space();
                    function f_cond_temp() {
                        output.assign("ρσ_cond_temp");
                        self.left.right.print(output);
                        leftvar = "ρσ_cond_temp";
                    };
f_cond_temp.__module__ = "output.operators";
undefined;

                    output.with_parens(f_cond_temp);
                }
                output.space();
                output.print("&&");
                output.space();
                output.print(leftvar);
                output.space();
                output.print(self.operator);
                output.space();
                self.right.print(output);
            } else if (self.operator === "**") {
                left = self.left;
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.left, AST_Unary) && !self.left.parenthesized) {
                    left = self.left.expression;
                    output.print(self.left.operator);
                }
                output.print("ρσ_operator_pow(");
                left.print(output);
                output.comma();
                self.right.print(output);
                output.print(")");
            } else if (self.operator === "==" || self.operator === "!=") {
                (write_smart_equality?.__call__?.bind(write_smart_equality) ?? write_smart_equality)(self, output);
            } else if (self.operator === "instanceof") {
                (write_instanceof?.__call__?.bind(write_instanceof) ?? write_instanceof)(self.left, self.right, output);
            } else if (self.operator === "*" && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.left, AST_String)) {
                [self.left.print(output), output.print(".repeat("), self.right.print(output), output.print(")")];
            } else if (self.operator === "===" || self.operator === "!==") {
                nan_check = null;
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right, AST_Symbol) && self.right.name === "NaN") {
                    nan_check = self.left;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.left, AST_Symbol) && self.left.name === "NaN") {
                    nan_check = self.right;
                }
                if (nan_check !== null) {
                    output.spaced(nan_check, (self.operator === "===") ? "!==" : "===", nan_check);
                } else {
                    output.spaced(self.left, self.operator, self.right);
                }
            } else if (self.operator === "+") {
                [output.print("ρσ_operator_add("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
            } else if (self.operator === "-") {
                [output.print("ρσ_operator_sub("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
            } else if (self.operator === "*") {
                [output.print("ρσ_operator_mul("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
            } else if (self.operator === "/") {
                [output.print("ρσ_operator_truediv("), self.left.print(output), output.comma(), 
                self.right.print(output), output.print(")")];
            } else if (self.operator === "//") {
                [output.print("ρσ_operator_floordiv("), self.left.print(output), output.comma(), 
                self.right.print(output), output.print(")")];
            } else {
                output.spaced(self.left, self.operator, self.right);
            }
        };
print_binary_op.__argnames__ = ["self", "output"];
print_binary_op.__module__ = "output.operators";
undefined;

        after_map = {".":"d","(":"c","[":"d","g":"g","null":"n"};
        function print_existential(self, output) {
            var key, after;
            key = (self.after === null || typeof self.after === "string") ? after_map[ρσ_bound_index(self.after, after_map)] : "e";
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.expression, AST_SymbolRef)) {
                if (key === "n") {
                    output.spaced("(typeof", self.expression, "!==", "\"undefined\"", "&&", self.expression, "!==", "null)");
                    return;
                }
                if (key === "c") {
                    output.spaced("(typeof", self.expression, "===", "\"function\"", "?", self.expression, ":", "(function(){return undefined;}))");
                    return;
                }
                after = self.after;
                if (key === "d") {
                    after = "Object.create(null)";
                } else if (key === "g") {
                    after = "{__getitem__:function(){return undefined;}}";
                }
                output.spaced("(typeof", self.expression, "!==", "\"undefined\"", "&&", self.expression, "!==", "null", "?", self.expression, ":", after);
                output.print(")");
                return;
            }
            output.print(ρσ_operator_add(ρσ_operator_add("ρσ_exists.", key), "("));
            self.expression.print(output);
            if (key === "e") {
                [output.comma(), self.after.print(output)];
            }
            output.print(")");
        };
print_existential.__argnames__ = ["self", "output"];
print_existential.__module__ = "output.operators";
undefined;

        function print_assignment(self, output) {
            var flattened, left, flat;
            flattened = false;
            left = self.left;
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(left, AST_Seq)) {
                left = new AST_Array({"elements":ρσ_list_decorate([ left.car, left.cdr ])});
            }
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(left, AST_Array)) {
                flat = left.flatten();
                flattened = flat.length > left.elements.length;
                output.print("ρσ_unpack");
            } else {
                left.print(output);
            }
            output.space();
            output.print(self.operator);
            output.space();
            if (flattened) {
                output.print("ρσ_flatten");
                output.with_parens((function() {
                    var ρσ_anonfunc = function () {
                        return self.right.print(output);                    };
ρσ_anonfunc.__module__ = "output.operators";
undefined;
                    return ρσ_anonfunc;
                })());
            } else {
                self.right.print(output);
            }
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(left, AST_Array)) {
                output.end_statement();
                if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right, AST_Seq) && !(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.right, AST_Array)) {
                    output.assign("ρσ_unpack");
                    [output.print(ρσ_operator_add("ρσ_unpack_asarray(", flat.length)), output.comma(), 
                    output.print("ρσ_unpack)")];
                    output.end_statement();
                }
                (unpack_tuple?.__call__?.bind(unpack_tuple) ?? unpack_tuple)(flat, output, true);
            }
        };
print_assignment.__argnames__ = ["self", "output"];
print_assignment.__module__ = "output.operators";
undefined;

        function print_assign(self, output) {
            var ρσ_unpack, left_hand_sides, rhs, is_compound_assign, lhs, temp_rhs;
            if (self.operator === "//=") {
                output.assign(self.left);
                output.print("Math.floor");
                function f_slash() {
                    self.left.print(output);
                    output.space();
                    output.print("/");
                    output.space();
                    self.right.print(output);
                };
f_slash.__module__ = "output.operators";
undefined;

                output.with_parens(f_slash);
                return;
            }
            if (self.operator === "+=") {
                output.assign(self.left);
                [output.print("ρσ_operator_iadd("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
                return;
            }
            if (self.operator === "-=") {
                output.assign(self.left);
                [output.print("ρσ_operator_isub("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
                return;
            }
            if (self.operator === "*=") {
                output.assign(self.left);
                [output.print("ρσ_operator_imul("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
                return;
            }
            if (self.operator === "/=") {
                output.assign(self.left);
                [output.print("ρσ_operator_idiv("), self.left.print(output), output.comma(), self.right.print(output), 
                output.print(")")];
                return;
            }
            if (self.operator === "=" && self.is_chained()) {
                ρσ_unpack = self.traverse_chain();
ρσ_unpack = ρσ_unpack_asarray(2, ρσ_unpack);
                left_hand_sides = ρσ_unpack[0];
                rhs = ρσ_unpack[1];
                is_compound_assign = false;
                var ρσ_Iter94 = left_hand_sides;
                ρσ_Iter94 = ((typeof ρσ_Iter94[Symbol.iterator] === "function") ? (ρσ_Iter94 instanceof Map ? ρσ_Iter94.keys() : ρσ_Iter94) : Object.keys(ρσ_Iter94));
                for (var ρσ_Index94 of ρσ_Iter94) {
                    lhs = ρσ_Index94;
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Seq) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(lhs, AST_Array)) {
                        is_compound_assign = true;
                        break;
                    }
                }
                if (is_compound_assign) {
                    temp_rhs = new AST_SymbolRef({"name":"ρσ_chain_assign_temp"});
                    (print_assignment?.__call__?.bind(print_assignment) ?? print_assignment)(new AST_Assign({"left":temp_rhs,"operator":"=","right":rhs}), output);
                    var ρσ_Iter95 = left_hand_sides;
                    ρσ_Iter95 = ((typeof ρσ_Iter95[Symbol.iterator] === "function") ? (ρσ_Iter95 instanceof Map ? ρσ_Iter95.keys() : ρσ_Iter95) : Object.keys(ρσ_Iter95));
                    for (var ρσ_Index95 of ρσ_Iter95) {
                        lhs = ρσ_Index95;
                        [output.end_statement(), output.indent()];
                        (print_assignment?.__call__?.bind(print_assignment) ?? print_assignment)(new AST_Assign({"left":lhs,"right":temp_rhs,"operator":self.operator}), output);
                    }
                } else {
                    var ρσ_Iter96 = left_hand_sides;
                    ρσ_Iter96 = ((typeof ρσ_Iter96[Symbol.iterator] === "function") ? (ρσ_Iter96 instanceof Map ? ρσ_Iter96.keys() : ρσ_Iter96) : Object.keys(ρσ_Iter96));
                    for (var ρσ_Index96 of ρσ_Iter96) {
                        lhs = ρσ_Index96;
                        output.spaced(lhs, "=", "");
                    }
                    rhs.print(output);
                }
            } else {
                (print_assignment?.__call__?.bind(print_assignment) ?? print_assignment)(self, output);
            }
        };
print_assign.__argnames__ = ["self", "output"];
print_assign.__module__ = "output.operators";
undefined;

        function print_conditional(self, output, condition, consequent, alternative) {
            var ρσ_unpack;
            ρσ_unpack = [self.condition, self.consequent, self.alternative];
            condition = ρσ_unpack[0];
            consequent = ρσ_unpack[1];
            alternative = ρσ_unpack[2];
            output.with_parens((function() {
                var ρσ_anonfunc = function () {
                    return condition.print(output);                };
ρσ_anonfunc.__module__ = "output.operators";
undefined;
                return ρσ_anonfunc;
            })());
            output.space();
            output.print("?");
            output.space();
            consequent.print(output);
            output.space();
            output.colon();
            alternative.print(output);
        };
print_conditional.__argnames__ = ["self", "output", "condition", "consequent", "alternative"];
print_conditional.__module__ = "output.operators";
undefined;

        function print_seq(output) {
            var self, p;
            self = this;
            p = output.parent();
            function print_seq0() {
                self.car.print(output);
                if (self.cdr) {
                    output.comma();
                    if (output.should_break()) {
                        output.newline();
                        output.indent();
                    }
                    self.cdr.print(output);
                }
            };
print_seq0.__module__ = "output.operators";
undefined;

            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Return) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Array) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_BaseCall) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_SimpleStatement)) {
                output.with_square(print_seq0);
            } else {
                (print_seq0?.__call__?.bind(print_seq0) ?? print_seq0)();
            }
        };
print_seq.__argnames__ = ["output"];
print_seq.__module__ = "output.operators";
undefined;

        ρσ_modules["output.operators"].comparators = comparators;
        ρσ_modules["output.operators"].function_ops = function_ops;
        ρσ_modules["output.operators"].after_map = after_map;
        ρσ_modules["output.operators"].print_getattr = print_getattr;
        ρσ_modules["output.operators"].print_getitem = print_getitem;
        ρσ_modules["output.operators"].print_rich_getitem = print_rich_getitem;
        ρσ_modules["output.operators"].print_splice_assignment = print_splice_assignment;
        ρσ_modules["output.operators"].print_delete = print_delete;
        ρσ_modules["output.operators"].print_unary_prefix = print_unary_prefix;
        ρσ_modules["output.operators"].write_instanceof = write_instanceof;
        ρσ_modules["output.operators"].write_smart_equality = write_smart_equality;
        ρσ_modules["output.operators"].print_binary_op = print_binary_op;
        ρσ_modules["output.operators"].print_existential = print_existential;
        ρσ_modules["output.operators"].print_assignment = print_assignment;
        ρσ_modules["output.operators"].print_assign = print_assign;
        ρσ_modules["output.operators"].print_conditional = print_conditional;
        ρσ_modules["output.operators"].print_seq = print_seq;
    })();

    (function(){
        var __name__ = "output.functions";
        var anonfunc, module_name;
        var AST_ClassCall = ρσ_modules.ast_types.AST_ClassCall;
        var AST_New = ρσ_modules.ast_types.AST_New;
        var has_calls = ρσ_modules.ast_types.has_calls;
        var AST_Dot = ρσ_modules.ast_types.AST_Dot;
        var AST_PropAccess = ρσ_modules.ast_types.AST_PropAccess;
        var AST_SymbolRef = ρσ_modules.ast_types.AST_SymbolRef;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        var OutputStream = ρσ_modules["output.stream"].OutputStream;

        var print_bracketed = ρσ_modules["output.statements"].print_bracketed;

        var create_doctring = ρσ_modules["output.utils"].create_doctring;

        var print_getattr = ρσ_modules["output.operators"].print_getattr;

        anonfunc = "ρσ_anonfunc";
        module_name = "null";
        function set_module_name(x) {
            module_name = (x) ? ρσ_operator_add(ρσ_operator_add("\"", x), "\"") : "null";
        };
set_module_name.__argnames__ = ["x"];
set_module_name.__module__ = "output.functions";
undefined;

        function decorate(decorators, output, func) {
            var pos;
            pos = 0;
            function wrap() {
                if (pos < decorators.length) {
                    decorators[(typeof pos === "number" && pos < 0) ? decorators.length + pos : pos].expression.print(output);
                    pos = ρσ_operator_iadd(pos, 1);
                    output.with_parens(wrap);
                } else {
                    (func?.__call__?.bind(func) ?? func)();
                }
            };
wrap.__module__ = "output.functions";
undefined;

            (wrap?.__call__?.bind(wrap) ?? wrap)();
        };
decorate.__argnames__ = ["decorators", "output", "func"];
decorate.__module__ = "output.functions";
undefined;

        function function_args(argnames, output, strip_first) {
            function f() {
                var ρσ_unpack, i, arg;
                if (argnames && argnames.length && (argnames.is_simple_func === true || argnames.is_simple_func === undefined)) {
                    var ρσ_Iter97 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)((strip_first) ? argnames.slice(1) : argnames);
                    ρσ_Iter97 = ((typeof ρσ_Iter97[Symbol.iterator] === "function") ? (ρσ_Iter97 instanceof Map ? ρσ_Iter97.keys() : ρσ_Iter97) : Object.keys(ρσ_Iter97));
                    for (var ρσ_Index97 of ρσ_Iter97) {
                        ρσ_unpack = ρσ_Index97;
                        i = ρσ_unpack[0];
                        arg = ρσ_unpack[1];
                        if (i) {
                            output.comma();
                        }
                        arg.print(output);
                    }
                }
            };
f.__module__ = "output.functions";
undefined;

            output.with_parens(f);
            output.space();
        };
function_args.__argnames__ = ["argnames", "output", "strip_first"];
function_args.__module__ = "output.functions";
undefined;

        function function_preamble(node, output, offset) {
            var a, fname, kw, i, ρσ_unpack, c, arg, dname, nargs;
            a = node.argnames;
            if (!a || a.is_simple_func) {
                return;
            }
            fname = (node.name) ? node.name.name : anonfunc;
            kw = "arguments[arguments.length-1]";
            var ρσ_Iter98 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(a);
            ρσ_Iter98 = ((typeof ρσ_Iter98[Symbol.iterator] === "function") ? (ρσ_Iter98 instanceof Map ? ρσ_Iter98.keys() : ρσ_Iter98) : Object.keys(ρσ_Iter98));
            for (var ρσ_Index98 of ρσ_Iter98) {
                ρσ_unpack = ρσ_Index98;
                c = ρσ_unpack[0];
                arg = ρσ_unpack[1];
                i = ρσ_operator_sub(c, offset);
                if (i >= 0) {
                    output.indent();
                    output.print("var");
                    output.space();
                    output.assign(arg);
                    if (Object.prototype.hasOwnProperty.call(a.defaults, arg.name)) {
                        output.spaced(ρσ_operator_add(ρσ_operator_add("(arguments[", i), "]"), "===", "undefined", "||", "(", i, "===", "arguments.length-1", "&&", kw, "!==", "null", "&&", "typeof", kw, "===", "\"object\"", "&&", kw, "[ρσ_kwargs_symbol]", "===", "true))", "?", "");
                        [output.print(ρσ_operator_add(fname, ".__defaults__.")), arg.print(output)];
                        [output.space(), output.print(":"), output.space()];
                    } else {
                        output.spaced("(", i, "===", "arguments.length-1", "&&", kw, "!==", "null", "&&", "typeof", kw, "===", "\"object\"", "&&", kw, "[ρσ_kwargs_symbol]", "===", "true)", "?", "undefined", ":", "");
                    }
                    output.print(ρσ_operator_add(ρσ_operator_add("arguments[", i), "]"));
                    output.end_statement();
                }
            }
            if (a.kwargs || a.has_defaults) {
                kw = (a.kwargs) ? a.kwargs.name : "ρσ_kwargs_obj";
                output.indent();
                output.spaced("var", kw, "=", "arguments[arguments.length-1]");
                output.end_statement();
                output.indent();
                output.spaced("if", ρσ_operator_add("(", kw), "===", "null", "||", "typeof", kw, "!==", "\"object\"", "||", kw, "[ρσ_kwargs_symbol]", "!==", "true)", kw, "=", "{}");
                output.end_statement();
                if (a.has_defaults) {
                    var ρσ_Iter99 = Object.keys(a.defaults);
                    ρσ_Iter99 = ((typeof ρσ_Iter99[Symbol.iterator] === "function") ? (ρσ_Iter99 instanceof Map ? ρσ_Iter99.keys() : ρσ_Iter99) : Object.keys(ρσ_Iter99));
                    for (var ρσ_Index99 of ρσ_Iter99) {
                        dname = ρσ_Index99;
                        output.indent();
                        output.spaced("if", ρσ_operator_add(ρσ_operator_add("(Object.prototype.hasOwnProperty.call(", kw), ","), ρσ_operator_add(ρσ_operator_add("\"", dname), "\"))"));
                        function f() {
                            output.indent();
                            output.spaced(dname, "=", ρσ_operator_add(ρσ_operator_add(kw, "."), dname));
                            output.end_statement();
                            if (a.kwargs) {
                                output.indent();
                                output.spaced("delete", ρσ_operator_add(ρσ_operator_add(kw, "."), dname));
                                output.end_statement();
                            }
                        };
f.__module__ = "output.functions";
undefined;

                        output.with_block(f);
                        output.newline();
                    }
                }
            }
            if (a.starargs !== undefined) {
                nargs = ρσ_operator_sub(a.length, offset);
                output.indent();
                output.spaced("var", a.starargs.name, "=", "Array.prototype.slice.call(arguments,", ρσ_operator_add(nargs, ")"));
                output.end_statement();
                output.indent();
                output.spaced("if", ρσ_operator_add("(", kw), "!==", "null", "&&", "typeof", kw, "===", "\"object\"", "&&", kw, "[ρσ_kwargs_symbol]", "===", "true)", a.starargs.name);
                output.print(".pop()");
                output.end_statement();
            }
        };
function_preamble.__argnames__ = ["node", "output", "offset"];
function_preamble.__module__ = "output.functions";
undefined;

        function has_annotations(self) {
            var arg;
            if (self.return_annotation) {
                return true;
            }
            var ρσ_Iter100 = self.argnames;
            ρσ_Iter100 = ((typeof ρσ_Iter100[Symbol.iterator] === "function") ? (ρσ_Iter100 instanceof Map ? ρσ_Iter100.keys() : ρσ_Iter100) : Object.keys(ρσ_Iter100));
            for (var ρσ_Index100 of ρσ_Iter100) {
                arg = ρσ_Index100;
                if (arg.annotation) {
                    return true;
                }
            }
            return false;
        };
has_annotations.__argnames__ = ["self"];
has_annotations.__module__ = "output.functions";
undefined;

        function function_annotation(self, output, strip_first, name) {
            var fname, props, defaults, dkeys;
            fname = name || ((self.name) ? self.name.name : anonfunc);
            props = Object.create(null);
            if (self.annotations && (has_annotations?.__call__?.bind(has_annotations) ?? has_annotations)(self)) {
                function annotations() {
                    var ρσ_unpack, i, arg;
                    output.print("{");
                    if (self.argnames && self.argnames.length) {
                        var ρσ_Iter101 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.argnames);
                        ρσ_Iter101 = ((typeof ρσ_Iter101[Symbol.iterator] === "function") ? (ρσ_Iter101 instanceof Map ? ρσ_Iter101.keys() : ρσ_Iter101) : Object.keys(ρσ_Iter101));
                        for (var ρσ_Index101 of ρσ_Iter101) {
                            ρσ_unpack = ρσ_Index101;
                            i = ρσ_unpack[0];
                            arg = ρσ_unpack[1];
                            if (arg.annotation) {
                                arg.print(output);
                                [output.print(":"), output.space()];
                                arg.annotation.print(output);
                                if (i < ρσ_operator_sub(self.argnames.length, 1) || self.return_annotation) {
                                    output.comma();
                                }
                            }
                        }
                    }
                    if (self.return_annotation) {
                        [output.print("return:"), output.space()];
                        self.return_annotation.print(output);
                    }
                    output.print("}");
                };
annotations.__module__ = "output.functions";
undefined;

                props.__annotations__ = annotations;
            }
            defaults = self.argnames.defaults;
            dkeys = Object.keys(self.argnames.defaults);
            if (dkeys.length) {
                function __defaults__() {
                    var ρσ_unpack, i, k;
                    output.print("{");
                    var ρσ_Iter102 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(dkeys);
                    ρσ_Iter102 = ((typeof ρσ_Iter102[Symbol.iterator] === "function") ? (ρσ_Iter102 instanceof Map ? ρσ_Iter102.keys() : ρσ_Iter102) : Object.keys(ρσ_Iter102));
                    for (var ρσ_Index102 of ρσ_Iter102) {
                        ρσ_unpack = ρσ_Index102;
                        i = ρσ_unpack[0];
                        k = ρσ_unpack[1];
                        [output.print(ρσ_operator_add(k, ":")), defaults[(typeof k === "number" && k < 0) ? defaults.length + k : k].print(output)];
                        if (i !== ρσ_operator_sub(dkeys.length, 1)) {
                            output.comma();
                        }
                    }
                    output.print("}");
                };
__defaults__.__module__ = "output.functions";
undefined;

                props.__defaults__ = __defaults__;
            }
            if (!self.argnames.is_simple_func) {
                function handle() {
                    output.print("true");
                };
handle.__module__ = "output.functions";
undefined;

                props.__handles_kwarg_interpolation__ = handle;
            }
            if (self.argnames.length > ((strip_first) ? 1 : 0)) {
                function argnames() {
                    var ρσ_unpack, i, arg;
                    output.print("[");
                    var ρσ_Iter103 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.argnames);
                    ρσ_Iter103 = ((typeof ρσ_Iter103[Symbol.iterator] === "function") ? (ρσ_Iter103 instanceof Map ? ρσ_Iter103.keys() : ρσ_Iter103) : Object.keys(ρσ_Iter103));
                    for (var ρσ_Index103 of ρσ_Iter103) {
                        ρσ_unpack = ρσ_Index103;
                        i = ρσ_unpack[0];
                        arg = ρσ_unpack[1];
                        if (strip_first && i === 0) {
                            continue;
                        }
                        output.print(JSON.stringify(arg.name));
                        if (i !== ρσ_operator_sub(self.argnames.length, 1)) {
                            output.comma();
                        }
                    }
                    output.print("]");
                };
argnames.__module__ = "output.functions";
undefined;

                props.__argnames__ = argnames;
            }
            if (output.options.keep_docstrings && self.docstrings && self.docstrings.length) {
                function doc() {
                    output.print(JSON.stringify((create_doctring?.__call__?.bind(create_doctring) ?? create_doctring)(self.docstrings)));
                };
doc.__module__ = "output.functions";
undefined;

                props.__doc__ = doc;
            }
            function module() {
                output.print(module_name);
            };
module.__module__ = "output.functions";
undefined;

            props.__module__ = module;
            var ρσ_Iter104 = props;
            ρσ_Iter104 = ((typeof ρσ_Iter104[Symbol.iterator] === "function") ? (ρσ_Iter104 instanceof Map ? ρσ_Iter104.keys() : ρσ_Iter104) : Object.keys(ρσ_Iter104));
            for (var ρσ_Index104 of ρσ_Iter104) {
                name = ρσ_Index104;
                output.print(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("", ρσ_str.format("{}", fname)), "."), ρσ_str.format("{}", name)), " = "));
                props[(typeof name === "number" && name < 0) ? props.length + name : name]();
                output.end_statement();
            }
            output.print("undefined");
            output.end_statement();
        };
function_annotation.__argnames__ = ["self", "output", "strip_first", "name"];
function_annotation.__module__ = "output.functions";
undefined;

        function function_definition(self, output, strip_first, as_expression) {
            var orig_indent;
            as_expression = as_expression || self.is_expression || self.is_anonymous;
            if (as_expression) {
                orig_indent = output.indentation();
                output.set_indentation(output.next_indent());
                [output.spaced("(function()", "{"), output.newline()];
                [output.indent(), output.spaced("var", anonfunc, "="), output.space()];
            }
            [output.print("function"), output.space()];
            if (self.name) {
                self.name.print(output);
            }
            if (self.is_generator) {
                [output.print("()"), output.space()];
                function output_generator() {
                    output.indent();
                    output.print("function* js_generator");
                    (function_args?.__call__?.bind(function_args) ?? function_args)(self.argnames, output, strip_first);
                    (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output, true, function_preamble);
                    output.newline();
                    output.indent();
                    output.spaced("var", "result", "=", "js_generator.apply(this,", "arguments)");
                    output.end_statement();
                    output.indent();
                    output.spaced("result.send", "=", "result.next");
                    output.end_statement();
                    output.indent();
                    output.spaced("return", "result");
                    output.end_statement();
                };
output_generator.__module__ = "output.functions";
undefined;

                output.with_block(output_generator);
            } else {
                (function_args?.__call__?.bind(function_args) ?? function_args)(self.argnames, output, strip_first);
                (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output, true, function_preamble);
            }
            if (as_expression) {
                output.end_statement();
                (function_annotation?.__call__?.bind(function_annotation) ?? function_annotation)(self, output, strip_first, anonfunc);
                [output.indent(), output.spaced("return", anonfunc), output.end_statement()];
                output.set_indentation(orig_indent);
                [output.indent(), output.print("})()")];
            }
        };
function_definition.__argnames__ = ["self", "output", "strip_first", "as_expression"];
function_definition.__module__ = "output.functions";
undefined;

        function print_function(output) {
            var self;
            self = this;
            if (self.decorators && self.decorators.length) {
                output.print("var");
                output.space();
                output.assign(self.name.name);
                function output_function_definition() {
                    (function_definition?.__call__?.bind(function_definition) ?? function_definition)(self, output, false, true);
                };
output_function_definition.__module__ = "output.functions";
undefined;

                (decorate?.__call__?.bind(decorate) ?? decorate)(self.decorators, output, output_function_definition);
                output.end_statement();
            } else {
                (function_definition?.__call__?.bind(function_definition) ?? function_definition)(self, output, false);
                if (!self.is_expression && !self.is_anonymous) {
                    output.end_statement();
                    (function_annotation?.__call__?.bind(function_annotation) ?? function_annotation)(self, output, false);
                }
            }
        };
print_function.__argnames__ = ["output"];
print_function.__module__ = "output.functions";
undefined;

        function find_this(expression) {
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expression, AST_Dot)) {
                return expression.expression;
            }
            if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(expression, AST_SymbolRef)) {
                return expression;
            }
        };
find_this.__argnames__ = ["expression"];
find_this.__module__ = "output.functions";
undefined;

        function print_this(expression, output) {
            var obj;
            obj = (find_this?.__call__?.bind(find_this) ?? find_this)(expression);
            if (obj) {
                obj.print(output);
            } else {
                output.print("this");
            }
        };
print_this.__argnames__ = ["expression", "output"];
print_this.__module__ = "output.functions";
undefined;

        function print_function_call(self, output) {
            var is_prototype_call, has_kwarg_items, has_kwarg_formals, has_kwargs, is_new, is_repeatable;
            is_prototype_call = false;
            function print_function_name(no_call) {
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_ClassCall)) {
                    if (self.static) {
                        self["class"].print(output);
                        output.print(".");
                        output.print(self.method);
                    } else {
                        is_prototype_call = true;
                        self["class"].print(output);
                        output.print(".prototype.");
                        output.print(self.method);
                        if (!no_call) {
                            output.print(".call");
                        }
                    }
                } else {
                    if (!is_repeatable) {
                        output.print("ρσ_expr_temp");
                        if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.expression, AST_Dot)) {
                            (print_getattr?.__call__?.bind(print_getattr) ?? print_getattr)(self.expression, output, true);
                        }
                    } else if (!is_new && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.expression, AST_SymbolRef)) {
                        output.print("(");
                        self.expression.print(output);
                        output.print("?.__call__?.bind(");
                        self.expression.print(output);
                        output.print(") ?? ");
                        self.expression.print(output);
                        output.print(")");
                    } else {
                        self.expression.print(output);
                    }
                }
            };
print_function_name.__argnames__ = ["no_call"];
print_function_name.__module__ = "output.functions";
undefined;

            function print_kwargs() {
                var ρσ_unpack, i, kwname, pair;
                output.print("ρσ_desugar_kwargs(");
                if (has_kwarg_items) {
                    var ρσ_Iter105 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.args.kwarg_items);
                    ρσ_Iter105 = ((typeof ρσ_Iter105[Symbol.iterator] === "function") ? (ρσ_Iter105 instanceof Map ? ρσ_Iter105.keys() : ρσ_Iter105) : Object.keys(ρσ_Iter105));
                    for (var ρσ_Index105 of ρσ_Iter105) {
                        ρσ_unpack = ρσ_Index105;
                        i = ρσ_unpack[0];
                        kwname = ρσ_unpack[1];
                        if (i > 0) {
                            output.print(",");
                            output.space();
                        }
                        kwname.print(output);
                    }
                    if (has_kwarg_formals) {
                        output.print(",");
                        output.space();
                    }
                }
                if (has_kwarg_formals) {
                    output.print("{");
                    var ρσ_Iter106 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.args.kwargs);
                    ρσ_Iter106 = ((typeof ρσ_Iter106[Symbol.iterator] === "function") ? (ρσ_Iter106 instanceof Map ? ρσ_Iter106.keys() : ρσ_Iter106) : Object.keys(ρσ_Iter106));
                    for (var ρσ_Index106 of ρσ_Iter106) {
                        ρσ_unpack = ρσ_Index106;
                        i = ρσ_unpack[0];
                        pair = ρσ_unpack[1];
                        if (i) {
                            output.comma();
                        }
                        pair[0].print(output);
                        output.print(":");
                        output.space();
                        pair[1].print(output);
                    }
                    output.print("}");
                }
                output.print(")");
            };
print_kwargs.__module__ = "output.functions";
undefined;

            function print_new(apply) {
                output.print("ρσ_interpolate_kwargs_constructor.call(");
                [output.print("Object.create("), self.expression.print(output), output.print(".prototype)")];
                output.comma();
                output.print((apply) ? "true" : "false");
                output.comma();
            };
print_new.__argnames__ = ["apply"];
print_new.__module__ = "output.functions";
undefined;

            function do_print_this() {
                if (!is_repeatable) {
                    output.print("ρσ_expr_temp");
                } else {
                    (print_this?.__call__?.bind(print_this) ?? print_this)(self.expression, output);
                }
                output.comma();
            };
do_print_this.__module__ = "output.functions";
undefined;

            function print_positional_args() {
                var i, expr, is_first;
                i = 0;
                while (i < self.args.length) {
                    expr = (ρσ_expr_temp = self.args)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
                    is_first = i === 0;
                    if (!is_first) {
                        output.print(".concat(");
                    }
                    if (expr.is_array) {
                        expr.print(output);
                        i = ρσ_operator_iadd(i, 1);
                    } else {
                        output.print("[");
                        while (i < self.args.length && !(ρσ_expr_temp = self.args)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].is_array) {
                            (ρσ_expr_temp = self.args)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].print(output);
                            if (ρσ_operator_add(i, 1) < self.args.length && !(ρσ_expr_temp = self.args)[ρσ_bound_index(ρσ_operator_add(i, 1), ρσ_expr_temp)].is_array) {
                                output.print(",");
                                output.space();
                            }
                            i = ρσ_operator_iadd(i, 1);
                        }
                        output.print("]");
                    }
                    if (!is_first) {
                        output.print(")");
                    }
                }
            };
print_positional_args.__module__ = "output.functions";
undefined;

            has_kwarg_items = self.args.kwarg_items && self.args.kwarg_items.length;
            has_kwarg_formals = self.args.kwargs && self.args.kwargs.length;
            has_kwargs = has_kwarg_items || has_kwarg_formals;
            is_new = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_New);
            is_repeatable = true;
            if (is_new && !self.args.length && !has_kwargs && !self.args.starargs) {
                [output.print("new"), output.space()];
                (print_function_name?.__call__?.bind(print_function_name) ?? print_function_name)();
                return;
            }
            if (!has_kwargs && !self.args.starargs) {
                function print_args() {
                    var ρσ_unpack, i, a;
                    var ρσ_Iter107 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.args);
                    ρσ_Iter107 = ((typeof ρσ_Iter107[Symbol.iterator] === "function") ? (ρσ_Iter107 instanceof Map ? ρσ_Iter107.keys() : ρσ_Iter107) : Object.keys(ρσ_Iter107));
                    for (var ρσ_Index107 of ρσ_Iter107) {
                        ρσ_unpack = ρσ_Index107;
                        i = ρσ_unpack[0];
                        a = ρσ_unpack[1];
                        if (i) {
                            output.comma();
                        }
                        a.print(output);
                    }
                };
print_args.__module__ = "output.functions";
undefined;

                if (is_new) {
                    [output.print("new"), output.space()];
                }
                (print_function_name?.__call__?.bind(print_function_name) ?? print_function_name)();
                output.with_parens(print_args);
                return;
            }
            is_repeatable = is_new || !(has_calls?.__call__?.bind(has_calls) ?? has_calls)(self.expression);
            if (!is_repeatable) {
                [output.assign("(ρσ_expr_temp"), (print_this?.__call__?.bind(print_this) ?? print_this)(self.expression, output), 
                output.comma()];
            }
            if (has_kwargs) {
                if (is_new) {
                    (print_new?.__call__?.bind(print_new) ?? print_new)(false);
                } else {
                    output.print("ρσ_interpolate_kwargs.call(");
                    (do_print_this?.__call__?.bind(do_print_this) ?? do_print_this)();
                }
                (print_function_name?.__call__?.bind(print_function_name) ?? print_function_name)(true);
                output.comma();
            } else {
                if (is_new) {
                    (print_new?.__call__?.bind(print_new) ?? print_new)(true);
                    (print_function_name?.__call__?.bind(print_function_name) ?? print_function_name)(true);
                    output.comma();
                } else {
                    (print_function_name?.__call__?.bind(print_function_name) ?? print_function_name)(true);
                    output.print(".apply(");
                    (do_print_this?.__call__?.bind(do_print_this) ?? do_print_this)();
                }
            }
            if (is_prototype_call && self.args.length > 1) {
                self.args.shift();
            }
            (print_positional_args?.__call__?.bind(print_positional_args) ?? print_positional_args)();
            if (has_kwargs) {
                if (self.args.length) {
                    output.print(".concat(");
                }
                output.print("[");
                (print_kwargs?.__call__?.bind(print_kwargs) ?? print_kwargs)();
                output.print("]");
                if (self.args.length) {
                    output.print(")");
                }
            }
            output.print(")");
            if (!is_repeatable) {
                output.print(")");
            }
        };
print_function_call.__argnames__ = ["self", "output"];
print_function_call.__module__ = "output.functions";
undefined;

        ρσ_modules["output.functions"].anonfunc = anonfunc;
        ρσ_modules["output.functions"].module_name = module_name;
        ρσ_modules["output.functions"].set_module_name = set_module_name;
        ρσ_modules["output.functions"].decorate = decorate;
        ρσ_modules["output.functions"].function_args = function_args;
        ρσ_modules["output.functions"].function_preamble = function_preamble;
        ρσ_modules["output.functions"].has_annotations = has_annotations;
        ρσ_modules["output.functions"].function_annotation = function_annotation;
        ρσ_modules["output.functions"].function_definition = function_definition;
        ρσ_modules["output.functions"].print_function = print_function;
        ρσ_modules["output.functions"].find_this = find_this;
        ρσ_modules["output.functions"].print_this = print_this;
        ρσ_modules["output.functions"].print_function_call = print_function_call;
    })();

    (function(){
        var __name__ = "output.classes";
        var AST_Class = ρσ_modules.ast_types.AST_Class;
        var AST_Method = ρσ_modules.ast_types.AST_Method;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        var decorate = ρσ_modules["output.functions"].decorate;
        var function_definition = ρσ_modules["output.functions"].function_definition;
        var function_annotation = ρσ_modules["output.functions"].function_annotation;

        var create_doctring = ρσ_modules["output.utils"].create_doctring;

        var has_prop = ρσ_modules.utils.has_prop;

        function print_class(output) {
            var self, decorators, num, i, seen_methods, property_names, defined_methods, sname, attr, stmt, di;
            self = this;
            if (self.external) {
                return;
            }
            function class_def(method, is_var) {
                output.indent();
                self.name.print(output);
                if (!is_var && method && (has_prop?.__call__?.bind(has_prop) ?? has_prop)(self.static, method)) {
                    output.assign(ρσ_operator_add(".", method));
                } else {
                    if (is_var) {
                        output.assign(ρσ_operator_add(ρσ_operator_add(".prototype[", method), "]"));
                    } else {
                        output.assign(ρσ_operator_add(".prototype", ((method) ? ρσ_operator_add(".", method) : "")));
                    }
                }
            };
class_def.__argnames__ = ["method", "is_var"];
class_def.__module__ = "output.classes";
undefined;

            function define_method(stmt, is_property) {
                var name, is_static, strip_first, fname;
                name = stmt.name.name;
                if (!is_property) {
                    (class_def?.__call__?.bind(class_def) ?? class_def)(name);
                }
                is_static = (has_prop?.__call__?.bind(has_prop) ?? has_prop)(self.static, name);
                strip_first = !is_static;
                if (stmt.decorators && stmt.decorators.length) {
                    (decorate?.__call__?.bind(decorate) ?? decorate)(stmt.decorators, output, (function() {
                        var ρσ_anonfunc = function () {
                            return (function_definition?.__call__?.bind(function_definition) ?? function_definition)(stmt, output, strip_first, true);                        };
ρσ_anonfunc.__module__ = "output.classes";
undefined;
                        return ρσ_anonfunc;
                    })());
                    output.end_statement();
                } else {
                    (function_definition?.__call__?.bind(function_definition) ?? function_definition)(stmt, output, strip_first);
                    if (!is_property) {
                        output.end_statement();
                        fname = ρσ_operator_add(ρσ_operator_add(self.name.name, ((is_static) ? "." : ".prototype.")), name);
                        (function_annotation?.__call__?.bind(function_annotation) ?? function_annotation)(stmt, output, strip_first, fname);
                    }
                }
            };
define_method.__argnames__ = ["stmt", "is_property"];
define_method.__module__ = "output.classes";
undefined;

            function define_default_method(name, body) {
                (class_def?.__call__?.bind(class_def) ?? class_def)(name);
                output.spaced("function", name, "()", "");
                output.with_block((function() {
                    var ρσ_anonfunc = function () {
                        return ρσ_list_decorate([ output.indent(), (body?.__call__?.bind(body) ?? body)() ]);                    };
ρσ_anonfunc.__module__ = "output.classes";
undefined;
                    return ρσ_anonfunc;
                })());
                output.end_statement();
            };
define_default_method.__argnames__ = ["name", "body"];
define_default_method.__module__ = "output.classes";
undefined;

            function add_hidden_property(name, proceed) {
                [output.indent(), output.print("Object.defineProperty(")];
                [self.name.print(output), output.print(".prototype"), output.comma(), output.print(JSON.stringify(name)), 
                output.comma()];
                [output.spaced("{value:", ""), (proceed?.__call__?.bind(proceed) ?? proceed)(), 
                output.print("})"), output.end_statement()];
            };
add_hidden_property.__argnames__ = ["name", "proceed"];
add_hidden_property.__module__ = "output.classes";
undefined;

            function write_constructor() {
                output.print("function");
                output.space();
                self.name.print(output);
                output.print("()");
                output.space();
                function f_constructor() {
                    output.indent();
                    output.spaced("if", "(this.ρσ_object_id", "===", "undefined)", "Object.defineProperty(this,", "\"ρσ_object_id\",", "{\"value\":++ρσ_object_counter})");
                    output.end_statement();
                    if (self.bound.length) {
                        output.indent();
                        [self.name.print(output), output.print(".prototype.__bind_methods__.call(this)")];
                        output.end_statement();
                    }
                    output.indent();
                    self.name.print(output);
                    [output.print(".prototype.__init__.apply(this"), output.comma(), output.print("arguments)")];
                    output.end_statement();
                };
f_constructor.__module__ = "output.classes";
undefined;

                output.with_block(f_constructor);
            };
write_constructor.__module__ = "output.classes";
undefined;

            decorators = self.decorators || ρσ_list_decorate([]);
            if (decorators.length) {
                output.print("var ");
                output.assign(self.name);
                (write_constructor?.__call__?.bind(write_constructor) ?? write_constructor)();
                output.semicolon();
            } else {
                (write_constructor?.__call__?.bind(write_constructor) ?? write_constructor)();
            }
            output.newline();
            if (decorators.length) {
                output.indent();
                self.name.print(output);
                output.spaced(".ρσ_decorators", "=", "[");
                num = decorators.length;
                for (var ρσ_Index108 = 0; ρσ_Index108 < num; ρσ_Index108++) {
                    i = ρσ_Index108;
                    decorators[(typeof i === "number" && i < 0) ? decorators.length + i : i].expression.print(output);
                    output.spaced((i < ρσ_operator_sub(num, 1)) ? "," : "]");
                }
                output.semicolon();
                output.newline();
            }
            if (self.parent) {
                output.indent();
                output.print("ρσ_extends");
                function f_extends() {
                    self.name.print(output);
                    output.comma();
                    self.parent.print(output);
                };
f_extends.__module__ = "output.classes";
undefined;

                output.with_parens(f_extends);
                output.end_statement();
            }
            if (self.bound.length) {
                seen_methods = Object.create(null);
                function f_bind_methods() {
                    output.spaced("function", "()", "");
                    function f_bases() {
                        var base, i, bname;
                        if (self.bases.length) {
                            for (var ρσ_Index109 = ρσ_operator_sub(self.bases.length, 1); ρσ_Index109 > -1; ρσ_Index109-=1) {
                                i = ρσ_Index109;
                                base = (ρσ_expr_temp = self.bases)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i];
                                [output.indent(), base.print(output), output.spaced(".prototype.__bind_methods__", "&&", "")];
                                [base.print(output), output.print(".prototype.__bind_methods__.call(this)")];
                                output.end_statement();
                            }
                        }
                        var ρσ_Iter110 = self.bound;
                        ρσ_Iter110 = ((typeof ρσ_Iter110[Symbol.iterator] === "function") ? (ρσ_Iter110 instanceof Map ? ρσ_Iter110.keys() : ρσ_Iter110) : Object.keys(ρσ_Iter110));
                        for (var ρσ_Index110 of ρσ_Iter110) {
                            bname = ρσ_Index110;
                            if (seen_methods[(typeof bname === "number" && bname < 0) ? seen_methods.length + bname : bname] || (ρσ_expr_temp = self.dynamic_properties)[(typeof bname === "number" && bname < 0) ? ρσ_expr_temp.length + bname : bname]) {
                                continue;
                            }
                            seen_methods[(typeof bname === "number" && bname < 0) ? seen_methods.length + bname : bname] = true;
                            [output.indent(), output.assign(ρσ_operator_add("this.", bname))];
                            [self.name.print(output), output.print(ρσ_operator_add(ρσ_operator_add(".prototype.", bname), ".bind(this)"))];
                            output.end_statement();
                        }
                    };
f_bases.__module__ = "output.classes";
undefined;

                    output.with_block(f_bases);
                };
f_bind_methods.__module__ = "output.classes";
undefined;

                (add_hidden_property?.__call__?.bind(add_hidden_property) ?? add_hidden_property)("__bind_methods__", f_bind_methods);
            }
            property_names = Object.keys(self.dynamic_properties);
            if (property_names.length) {
                output.indent();
                output.print("Object.defineProperties");
                function f_props() {
                    self.name.print(output);
                    output.print(".prototype");
                    output.comma();
                    output.space();
                    function f_enum() {
                        var prop, name;
                        var ρσ_Iter111 = property_names;
                        ρσ_Iter111 = ((typeof ρσ_Iter111[Symbol.iterator] === "function") ? (ρσ_Iter111 instanceof Map ? ρσ_Iter111.keys() : ρσ_Iter111) : Object.keys(ρσ_Iter111));
                        for (var ρσ_Index111 of ρσ_Iter111) {
                            name = ρσ_Index111;
                            prop = (ρσ_expr_temp = self.dynamic_properties)[(typeof name === "number" && name < 0) ? ρσ_expr_temp.length + name : name];
                            [output.indent(), output.print(ρσ_operator_add(JSON.stringify(name), ":")), output.space()];
                            function f_enum2() {
                                [output.indent(), output.print("\"enumerable\":"), output.space(), output.print("true"), 
                                output.comma(), output.newline()];
                                if (prop.getter) {
                                    [output.indent(), output.print("\"get\":"), output.space()];
                                    [(define_method?.__call__?.bind(define_method) ?? define_method)(prop.getter, true), 
                                    output.comma(), output.newline()];
                                }
                                [output.indent(), output.print("\"set\":"), output.space()];
                                if (prop.setter) {
                                    [(define_method?.__call__?.bind(define_method) ?? define_method)(prop.setter, true), 
                                    output.newline()];
                                } else {
                                    [output.spaced("function", "()", "{", "throw new AttributeError(\"can't set attribute\")", "}"), 
                                    output.newline()];
                                }
                            };
f_enum2.__module__ = "output.classes";
undefined;

                            output.with_block(f_enum2);
                            output.comma();
                            output.newline();
                        }
                    };
f_enum.__module__ = "output.classes";
undefined;

                    output.with_block(f_enum);
                };
f_props.__module__ = "output.classes";
undefined;

                output.with_parens(f_props);
                output.end_statement();
            }
            if (!self.init) {
                function f_default() {
                    if (self.parent) {
                        self.parent.print(output);
                        output.spaced(".prototype.__init__", "&&");
                        [output.space(), self.parent.print(output)];
                        output.print(".prototype.__init__.apply");
                        function f_this_arguments() {
                            output.print("this");
                            output.comma();
                            output.print("arguments");
                        };
f_this_arguments.__module__ = "output.classes";
undefined;

                        output.with_parens(f_this_arguments);
                        output.end_statement();
                    }
                };
f_default.__module__ = "output.classes";
undefined;

                (define_default_method?.__call__?.bind(define_default_method) ?? define_default_method)("__init__", f_default);
            }
            defined_methods = Object.create(null);
            var ρσ_Iter112 = self.body;
            ρσ_Iter112 = ((typeof ρσ_Iter112[Symbol.iterator] === "function") ? (ρσ_Iter112 instanceof Map ? ρσ_Iter112.keys() : ρσ_Iter112) : Object.keys(ρσ_Iter112));
            for (var ρσ_Index112 of ρσ_Iter112) {
                stmt = ρσ_Index112;
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Method)) {
                    if (stmt.is_getter || stmt.is_setter) {
                        continue;
                    }
                    (define_method?.__call__?.bind(define_method) ?? define_method)(stmt);
                    defined_methods[ρσ_bound_index(stmt.name.name, defined_methods)] = true;
                    sname = stmt.name.name;
                    if (sname === "__init__") {
                        var ρσ_Iter113 = ρσ_list_decorate([ ".__argnames__", ".__handles_kwarg_interpolation__" ]);
                        ρσ_Iter113 = ((typeof ρσ_Iter113[Symbol.iterator] === "function") ? (ρσ_Iter113 instanceof Map ? ρσ_Iter113.keys() : ρσ_Iter113) : Object.keys(ρσ_Iter113));
                        for (var ρσ_Index113 of ρσ_Iter113) {
                            attr = ρσ_Index113;
                            [output.indent(), self.name.print(output), output.assign(attr)];
                            [self.name.print(output), output.print(ρσ_operator_add(".prototype.__init__", attr)), 
                            output.end_statement()];
                        }
                    }
                    if (sname === "__iter__") {
                        (class_def?.__call__?.bind(class_def) ?? class_def)("ρσ_iterator_symbol", true);
                        self.name.print(output);
                        output.print(ρσ_operator_add(".prototype.", stmt.name.name));
                        output.end_statement();
                    }
                } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Class)) {
                    console.error("Nested classes aren't supported yet");
                }
            }
            if (!defined_methods["__repr__"]) {
                function f_repr() {
                    if (self.parent) {
                        [output.print("if("), self.parent.print(output), output.spaced(".prototype.__repr__)", "return", self.parent)];
                        [output.print(".prototype.__repr__.call(this)"), output.end_statement()];
                    }
                    [output.indent(), output.spaced("return", "\"<\"", "+", "__name__", "+", "\".\"", "+", "this.constructor.name", "")];
                    output.spaced("+", "\" #\"", "+", "this.ρσ_object_id", "+", "\">\"");
                    output.end_statement();
                };
f_repr.__module__ = "output.classes";
undefined;

                (define_default_method?.__call__?.bind(define_default_method) ?? define_default_method)("__repr__", f_repr);
            }
            if (!defined_methods["__str__"]) {
                function f_str() {
                    if (self.parent) {
                        [output.print("if("), self.parent.print(output), output.spaced(".prototype.__str__)", "return", self.parent)];
                        [output.print(".prototype.__str__.call(this)"), output.end_statement()];
                    }
                    output.spaced("return", "this.__repr__()");
                    output.end_statement();
                };
f_str.__module__ = "output.classes";
undefined;

                (define_default_method?.__call__?.bind(define_default_method) ?? define_default_method)("__str__", f_str);
            }
            function f_basis() {
                var i;
                output.print("[");
                var ρσ_Iter114 = (range?.__call__?.bind(range) ?? range)((len?.__call__?.bind(len) ?? len)(self.bases));
                ρσ_Iter114 = ((typeof ρσ_Iter114[Symbol.iterator] === "function") ? (ρσ_Iter114 instanceof Map ? ρσ_Iter114.keys() : ρσ_Iter114) : Object.keys(ρσ_Iter114));
                for (var ρσ_Index114 of ρσ_Iter114) {
                    i = ρσ_Index114;
                    (ρσ_expr_temp = self.bases)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].print(output);
                    if (i < ρσ_operator_sub(self.bases.length, 1)) {
                        output.comma();
                    }
                }
                output.print("]");
            };
f_basis.__module__ = "output.classes";
undefined;

            (add_hidden_property?.__call__?.bind(add_hidden_property) ?? add_hidden_property)("__bases__", f_basis);
            if (self.bases.length > 1) {
                output.indent();
                output.print("ρσ_mixin(");
                self.name.print(output);
                var ρσ_Iter115 = (range?.__call__?.bind(range) ?? range)(1, (len?.__call__?.bind(len) ?? len)(self.bases));
                ρσ_Iter115 = ((typeof ρσ_Iter115[Symbol.iterator] === "function") ? (ρσ_Iter115 instanceof Map ? ρσ_Iter115.keys() : ρσ_Iter115) : Object.keys(ρσ_Iter115));
                for (var ρσ_Index115 of ρσ_Iter115) {
                    i = ρσ_Index115;
                    output.comma();
                    (ρσ_expr_temp = self.bases)[(typeof i === "number" && i < 0) ? ρσ_expr_temp.length + i : i].print(output);
                }
                [output.print(")"), output.end_statement()];
            }
            if (self.docstrings && self.docstrings.length && output.options.keep_docstrings) {
                function f_doc() {
                    output.print(JSON.stringify((create_doctring?.__call__?.bind(create_doctring) ?? create_doctring)(self.docstrings)));
                };
f_doc.__module__ = "output.classes";
undefined;

                (add_hidden_property?.__call__?.bind(add_hidden_property) ?? add_hidden_property)("__doc__", f_doc);
            }
            var ρσ_Iter116 = self.statements;
            ρσ_Iter116 = ((typeof ρσ_Iter116[Symbol.iterator] === "function") ? (ρσ_Iter116 instanceof Map ? ρσ_Iter116.keys() : ρσ_Iter116) : Object.keys(ρσ_Iter116));
            for (var ρσ_Index116 of ρσ_Iter116) {
                stmt = ρσ_Index116;
                if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(stmt, AST_Method)) {
                    output.indent();
                    stmt.print(output);
                    output.newline();
                }
            }
            if (decorators.length) {
                output.indent();
                output.assign(self.name);
                for (var ρσ_Index117 = 0; ρσ_Index117 < decorators.length; ρσ_Index117++) {
                    di = ρσ_Index117;
                    self.name.print(output);
                    output.print(ρσ_operator_add(ρσ_operator_add(".ρσ_decorators[", ρσ_str.format("{}", di)), "]("));
                }
                self.name.print(output);
                output.print(")".repeat(decorators.length));
                output.semicolon();
                output.newline();
                output.indent();
                output.spaced("delete ");
                self.name.print(output);
                output.print(".ρσ_decorators");
                output.semicolon();
                output.newline();
            }
        };
print_class.__argnames__ = ["output"];
print_class.__module__ = "output.classes";
undefined;

        ρσ_modules["output.classes"].print_class = print_class;
    })();

    (function(){
        var __name__ = "output.literals";
        var AST_Binary = ρσ_modules.ast_types.AST_Binary;
        var AST_Number = ρσ_modules.ast_types.AST_Number;
        var AST_String = ρσ_modules.ast_types.AST_String;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        function print_array(self, output) {
            output.print("ρσ_list_decorate");
            function f_list_decorate() {
                function f_list_decorate0() {
                    var a, len_, ρσ_unpack, i, exp;
                    a = self.elements;
                    len_ = a.length;
                    if (len_ > 0) {
                        output.space();
                    }
                    var ρσ_Iter118 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(a);
                    ρσ_Iter118 = ((typeof ρσ_Iter118[Symbol.iterator] === "function") ? (ρσ_Iter118 instanceof Map ? ρσ_Iter118.keys() : ρσ_Iter118) : Object.keys(ρσ_Iter118));
                    for (var ρσ_Index118 of ρσ_Iter118) {
                        ρσ_unpack = ρσ_Index118;
                        i = ρσ_unpack[0];
                        exp = ρσ_unpack[1];
                        if (i) {
                            output.comma();
                        }
                        exp.print(output);
                    }
                    if (len_ > 0) {
                        output.space();
                    }
                };
f_list_decorate0.__module__ = "output.literals";
undefined;

                output.with_square(f_list_decorate0);
            };
f_list_decorate.__module__ = "output.literals";
undefined;

            output.with_parens(f_list_decorate);
        };
print_array.__argnames__ = ["self", "output"];
print_array.__module__ = "output.literals";
undefined;

        function print_obj_literal_slow(self, output) {
            function f_obj_literal_slow() {
                output.print("function()");
                function f_obj_literal_slow0() {
                    var ρσ_unpack, i, prop;
                    output.indent();
                    if (self.is_pydict) {
                        output.spaced.apply(output, "var ρσ_d = ρσ_dict()".split(" "));
                    } else {
                        output.spaced("var", "ρσ_d", "=", (self.is_jshash) ? "Object.create(null)" : "{}");
                    }
                    output.end_statement();
                    var ρσ_Iter119 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.properties);
                    ρσ_Iter119 = ((typeof ρσ_Iter119[Symbol.iterator] === "function") ? (ρσ_Iter119 instanceof Map ? ρσ_Iter119.keys() : ρσ_Iter119) : Object.keys(ρσ_Iter119));
                    for (var ρσ_Index119 of ρσ_Iter119) {
                        ρσ_unpack = ρσ_Index119;
                        i = ρσ_unpack[0];
                        prop = ρσ_unpack[1];
                        output.indent();
                        if (self.is_pydict) {
                            output.print("ρσ_d.set");
                            function f_py_dict() {
                                prop.key.print(output);
                                [output.print(","), output.space()];
                                prop.value.print(output);
                            };
f_py_dict.__module__ = "output.literals";
undefined;

                            output.with_parens(f_py_dict);
                        } else {
                            output.print("ρσ_d");
                            output.with_square((function() {
                                var ρσ_anonfunc = function () {
                                    return prop.key.print(output);                                };
ρσ_anonfunc.__module__ = "output.literals";
undefined;
                                return ρσ_anonfunc;
                            })());
                            [output.space(), output.print("="), output.space()];
                            prop.value.print(output);
                        }
                        output.end_statement();
                    }
                    output.indent();
                    output.spaced("return", "ρσ_d");
                    output.end_statement();
                };
f_obj_literal_slow0.__module__ = "output.literals";
undefined;

                output.with_block(f_obj_literal_slow0);
            };
f_obj_literal_slow.__module__ = "output.literals";
undefined;

            output.with_parens(f_obj_literal_slow);
            output.print(".call(this)");
        };
print_obj_literal_slow.__argnames__ = ["self", "output"];
print_obj_literal_slow.__module__ = "output.literals";
undefined;

        function print_obj_literal(self, output) {
            var ρσ_unpack, i, prop;
            if (self.is_pydict) {
                (print_obj_literal_slow?.__call__?.bind(print_obj_literal_slow) ?? print_obj_literal_slow)(self, output);
                return;
            }
            output.print("{");
            var ρσ_Iter120 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(self.properties);
            ρσ_Iter120 = ((typeof ρσ_Iter120[Symbol.iterator] === "function") ? (ρσ_Iter120 instanceof Map ? ρσ_Iter120.keys() : ρσ_Iter120) : Object.keys(ρσ_Iter120));
            for (var ρσ_Index120 of ρσ_Iter120) {
                ρσ_unpack = ρσ_Index120;
                i = ρσ_unpack[0];
                prop = ρσ_unpack[1];
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop.key, AST_Number) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(prop.key, AST_String)) {
                    prop.key.print(output);
                } else {
                    function key() {
                        prop.key.print(output);
                    };
key.__module__ = "output.literals";
undefined;

                    output.with_square(key);
                }
                output.print(":");
                prop.value.print(output);
                if (ρσ_operator_add(i, 1) < (len?.__call__?.bind(len) ?? len)(self.properties)) {
                    output.print(",");
                }
            }
            output.print("}");
        };
print_obj_literal.__argnames__ = ["self", "output"];
print_obj_literal.__module__ = "output.literals";
undefined;

        function print_object(self, output) {
            if (self.is_pydict) {
                if (self.properties.length > 0) {
                    (print_obj_literal?.__call__?.bind(print_obj_literal) ?? print_obj_literal)(self, output);
                } else {
                    output.print("ρσ_dict()");
                }
            } else {
                if (self.properties.length > 0) {
                    (print_obj_literal?.__call__?.bind(print_obj_literal) ?? print_obj_literal)(self, output);
                } else {
                    output.print((self.is_jshash) ? "Object.create(null)" : "{}");
                }
            }
        };
print_object.__argnames__ = ["self", "output"];
print_object.__module__ = "output.literals";
undefined;

        function print_set(self, output) {
            if (self.items.length === 0) {
                output.print("ρσ_set()");
                return;
            }
            function f_print_set() {
                output.print("function()");
                function f_print_set0() {
                    var item;
                    output.indent();
                    output.spaced.apply(output, "var s = ρσ_set()".split(" "));
                    output.end_statement();
                    var ρσ_Iter121 = self.items;
                    ρσ_Iter121 = ((typeof ρσ_Iter121[Symbol.iterator] === "function") ? (ρσ_Iter121 instanceof Map ? ρσ_Iter121.keys() : ρσ_Iter121) : Object.keys(ρσ_Iter121));
                    for (var ρσ_Index121 of ρσ_Iter121) {
                        item = ρσ_Index121;
                        output.indent();
                        output.print("s.jsset.add");
                        output.with_parens((function() {
                            var ρσ_anonfunc = function () {
                                return item.value.print(output);                            };
ρσ_anonfunc.__module__ = "output.literals";
undefined;
                            return ρσ_anonfunc;
                        })());
                        output.end_statement();
                    }
                    output.indent();
                    output.spaced("return", "s");
                    output.end_statement();
                };
f_print_set0.__module__ = "output.literals";
undefined;

                output.with_block(f_print_set0);
            };
f_print_set.__module__ = "output.literals";
undefined;

            output.with_parens(f_print_set);
            output.print("()");
        };
print_set.__argnames__ = ["self", "output"];
print_set.__module__ = "output.literals";
undefined;

        function print_regexp(self, output) {
            var str_, p;
            str_ = self.value.toString();
            if (output.options.ascii_only) {
                str_ = output.to_ascii(str_);
            }
            output.print(str_);
            p = output.parent();
            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary) && new RegExp("^in").test(p.operator) && p.left === self) {
                output.print(" ");
            }
        };
print_regexp.__argnames__ = ["self", "output"];
print_regexp.__module__ = "output.literals";
undefined;

        ρσ_modules["output.literals"].print_array = print_array;
        ρσ_modules["output.literals"].print_obj_literal_slow = print_obj_literal_slow;
        ρσ_modules["output.literals"].print_obj_literal = print_obj_literal;
        ρσ_modules["output.literals"].print_object = print_object;
        ρσ_modules["output.literals"].print_set = print_set;
        ρσ_modules["output.literals"].print_regexp = print_regexp;
    })();

    (function(){
        var __name__ = "output.comments";
        var AST_Exit = ρσ_modules.ast_types.AST_Exit;
        var is_node_type = ρσ_modules.ast_types.is_node_type;

        function output_comments(comments, output, nlb) {
            var comm;
            var ρσ_Iter122 = comments;
            ρσ_Iter122 = ((typeof ρσ_Iter122[Symbol.iterator] === "function") ? (ρσ_Iter122 instanceof Map ? ρσ_Iter122.keys() : ρσ_Iter122) : Object.keys(ρσ_Iter122));
            for (var ρσ_Index122 of ρσ_Iter122) {
                comm = ρσ_Index122;
                if (comm.type === "comment1") {
                    output.print(ρσ_operator_add(ρσ_operator_add("//", comm.value), "\n"));
                    output.indent();
                } else if (comm.type === "comment2") {
                    output.print(ρσ_operator_add(ρσ_operator_add("/*", comm.value), "*/"));
                    if (nlb) {
                        output.print("\n");
                        output.indent();
                    } else {
                        output.space();
                    }
                }
            }
        };
output_comments.__argnames__ = ["comments", "output", "nlb"];
output_comments.__module__ = "output.comments";
undefined;

        function print_comments(self, output) {
            var c, start, comments;
            c = output.options.comments;
            if (c) {
                start = self.start;
                if (start && !start._comments_dumped) {
                    start._comments_dumped = true;
                    comments = start.comments_before;
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self, AST_Exit) && self.value && self.value.start.comments_before && self.value.start.comments_before.length > 0) {
                        comments = (comments || ρσ_list_decorate([])).concat(self.value.start.comments_before);
                        self.value.start.comments_before = ρσ_list_decorate([]);
                    }
                    if (c.test) {
                        comments = comments.filter((function() {
                            var ρσ_anonfunc = function (comment) {
                                return c.test(comment.value);                            };
ρσ_anonfunc.__argnames__ = ["comment"];
ρσ_anonfunc.__module__ = "output.comments";
undefined;
                            return ρσ_anonfunc;
                        })());
                    } else if (typeof c === "function") {
                        comments = comments.filter((function() {
                            var ρσ_anonfunc = function (comment) {
                                return (c?.__call__?.bind(c) ?? c)(self, comment);                            };
ρσ_anonfunc.__argnames__ = ["comment"];
ρσ_anonfunc.__module__ = "output.comments";
undefined;
                            return ρσ_anonfunc;
                        })());
                    }
                    (output_comments?.__call__?.bind(output_comments) ?? output_comments)(comments, output, start.nlb);
                }
            }
        };
print_comments.__argnames__ = ["self", "output"];
print_comments.__module__ = "output.comments";
undefined;

        ρσ_modules["output.comments"].output_comments = output_comments;
        ρσ_modules["output.comments"].print_comments = print_comments;
    })();

    (function(){
        var __name__ = "output.modules";
        var declare_vars = ρσ_modules["output.statements"].declare_vars;
        var display_body = ρσ_modules["output.statements"].display_body;

        var OutputStream = ρσ_modules["output.stream"].OutputStream;

        var create_doctring = ρσ_modules["output.utils"].create_doctring;

        var print_comments = ρσ_modules["output.comments"].print_comments;
        var output_comments = ρσ_modules["output.comments"].output_comments;

        var set_module_name = ρσ_modules["output.functions"].set_module_name;

        var get_compiler_version = ρσ_modules.parse.get_compiler_version;

        var cache_file_name = ρσ_modules.utils.cache_file_name;

        function write_imports(module, output) {
            var imports, import_id, nonlocalvars, name, module_, module_id;
            imports = ρσ_list_decorate([]);
            var ρσ_Iter123 = Object.keys(module.imports);
            ρσ_Iter123 = ((typeof ρσ_Iter123[Symbol.iterator] === "function") ? (ρσ_Iter123 instanceof Map ? ρσ_Iter123.keys() : ρσ_Iter123) : Object.keys(ρσ_Iter123));
            for (var ρσ_Index123 of ρσ_Iter123) {
                import_id = ρσ_Index123;
                imports.push((ρσ_expr_temp = module.imports)[(typeof import_id === "number" && import_id < 0) ? ρσ_expr_temp.length + import_id : import_id]);
            }
            function compare(a, b) {
                var ρσ_unpack;
                ρσ_unpack = [a.import_order, b.import_order];
                a = ρσ_unpack[0];
                b = ρσ_unpack[1];
                return (a < b) ? -1 : (a > b) ? 1 : 0;
            };
compare.__argnames__ = ["a", "b"];
compare.__module__ = "output.modules";
undefined;

            imports.sort(compare);
            if (imports.length > 1) {
                output.indent();
                output.print("var ρσ_modules = {};");
                output.newline();
            }
            nonlocalvars = Object.create(null);
            var ρσ_Iter124 = imports;
            ρσ_Iter124 = ((typeof ρσ_Iter124[Symbol.iterator] === "function") ? (ρσ_Iter124 instanceof Map ? ρσ_Iter124.keys() : ρσ_Iter124) : Object.keys(ρσ_Iter124));
            for (var ρσ_Index124 of ρσ_Iter124) {
                module_ = ρσ_Index124;
                var ρσ_Iter125 = module_.nonlocalvars;
                ρσ_Iter125 = ((typeof ρσ_Iter125[Symbol.iterator] === "function") ? (ρσ_Iter125 instanceof Map ? ρσ_Iter125.keys() : ρσ_Iter125) : Object.keys(ρσ_Iter125));
                for (var ρσ_Index125 of ρσ_Iter125) {
                    name = ρσ_Index125;
                    nonlocalvars[(typeof name === "number" && name < 0) ? nonlocalvars.length + name : name] = true;
                }
            }
            nonlocalvars = Object.getOwnPropertyNames(nonlocalvars).join(", ");
            if (nonlocalvars.length) {
                output.indent();
                output.print(ρσ_operator_add("var ", nonlocalvars));
                output.semicolon();
                output.newline();
            }
            var ρσ_Iter126 = imports;
            ρσ_Iter126 = ((typeof ρσ_Iter126[Symbol.iterator] === "function") ? (ρσ_Iter126 instanceof Map ? ρσ_Iter126.keys() : ρσ_Iter126) : Object.keys(ρσ_Iter126));
            for (var ρσ_Index126 of ρσ_Iter126) {
                module_ = ρσ_Index126;
                module_id = module_.module_id;
                if (module_id !== "__main__") {
                    output.indent();
                    if (module_id.indexOf(".") === -1) {
                        output.print(ρσ_operator_add("ρσ_modules.", module_id));
                    } else {
                        output.print(ρσ_operator_add(ρσ_operator_add("ρσ_modules[\"", module_id), "\"]"));
                    }
                    [output.space(), output.print("="), output.space(), output.print("{}")];
                    output.end_statement();
                }
            }
            var ρσ_Iter127 = imports;
            ρσ_Iter127 = ((typeof ρσ_Iter127[Symbol.iterator] === "function") ? (ρσ_Iter127 instanceof Map ? ρσ_Iter127.keys() : ρσ_Iter127) : Object.keys(ρσ_Iter127));
            for (var ρσ_Index127 of ρσ_Iter127) {
                module_ = ρσ_Index127;
                if (module_.module_id !== "__main__") {
                    (print_module?.__call__?.bind(print_module) ?? print_module)(module_, output);
                }
            }
        };
write_imports.__argnames__ = ["module", "output"];
write_imports.__module__ = "output.modules";
undefined;

        function write_main_name(output) {
            if (output.options.write_name) {
                output.newline();
                output.indent();
                output.print("var __name__ = \"__main__\"");
                output.semicolon();
                output.newline();
                output.newline();
            }
        };
write_main_name.__argnames__ = ["output"];
write_main_name.__module__ = "output.modules";
undefined;

        function declare_exports(module_id, exports, output, docstrings) {
            var seen, v, symbol;
            seen = Object.create(null);
            if (output.options.keep_docstrings && docstrings && docstrings.length) {
                exports.push({"name":"__doc__","refname":"ρσ_module_doc__"});
                [output.newline(), output.indent()];
                v = "var";
                [output.assign(ρσ_operator_add(v, " ρσ_module_doc__")), output.print(JSON.stringify((create_doctring?.__call__?.bind(create_doctring) ?? create_doctring)(docstrings)))];
                output.end_statement();
            }
            output.newline();
            var ρσ_Iter128 = exports;
            ρσ_Iter128 = ((typeof ρσ_Iter128[Symbol.iterator] === "function") ? (ρσ_Iter128 instanceof Map ? ρσ_Iter128.keys() : ρσ_Iter128) : Object.keys(ρσ_Iter128));
            for (var ρσ_Index128 of ρσ_Iter128) {
                symbol = ρσ_Index128;
                if (!Object.prototype.hasOwnProperty.call(seen, symbol.name)) {
                    output.indent();
                    if (module_id.indexOf(".") === -1) {
                        output.print(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("ρσ_modules.", module_id), "."), symbol.name));
                    } else {
                        output.print(ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("ρσ_modules[\"", module_id), "\"]."), symbol.name));
                    }
                    [output.space(), output.print("="), output.space(), output.print(symbol.refname || symbol.name)];
                    seen[ρσ_bound_index(symbol.name, seen)] = true;
                    output.end_statement();
                }
            }
        };
declare_exports.__argnames__ = ["module_id", "exports", "output", "docstrings"];
declare_exports.__module__ = "output.modules";
undefined;

        function prologue(module, output) {
            var v;
            if (output.options.omit_baselib) {
                return;
            }
            output.indent();
            v = "var";
            [output.print(v), output.space()];
            output.spaced.apply(output, "ρσ_iterator_symbol = (typeof Symbol === \"function\" && typeof Symbol.iterator === \"symbol\") ? Symbol.iterator : \"iterator-Symbol-5d0927e5554349048cf0e3762a228256\"".split(" "));
            output.end_statement();
            [output.indent(), output.print(v), output.space()];
            output.spaced.apply(output, "ρσ_kwargs_symbol = (typeof Symbol === \"function\") ? Symbol(\"kwargs-object\") : \"kwargs-object-Symbol-5d0927e5554349048cf0e3762a228256\"".split(" "));
            output.end_statement();
            [output.indent(), output.spaced("var", "ρσ_cond_temp,", "ρσ_expr_temp,", "ρσ_last_exception"), 
            output.end_statement()];
            [output.indent(), output.spaced("var", "ρσ_object_counter", "=", "0"), output.end_statement()];
            [output.indent(), output.spaced("if(", "typeof", "HTMLCollection", "!==", "\"undefined\"", "&&", "typeof", "Symbol", "===", "\"function\")", "NodeList.prototype[Symbol.iterator]", "=", "HTMLCollection.prototype[Symbol.iterator]", "=", "NamedNodeMap.prototype[Symbol.iterator]", "=", "Array.prototype[Symbol.iterator]")];
            output.end_statement();
            if (!output.options.baselib_plain) {
                throw new ValueError("The baselib is missing! Remember to set the baselib_plain field on the options for OutputStream");
            }
            output.print(output.options.baselib_plain);
            output.end_statement();
        };
prologue.__argnames__ = ["module", "output"];
prologue.__module__ = "output.modules";
undefined;

        function print_top_level(self, output) {
            var is_main;
            (set_module_name?.__call__?.bind(set_module_name) ?? set_module_name)(self.module_id);
            is_main = self.module_id === "__main__";
            function write_docstrings() {
                var v;
                if (is_main && output.options.keep_docstrings && self.docstrings && self.docstrings.length) {
                    [output.newline(), output.indent()];
                    v = "var";
                    [output.assign(ρσ_operator_add(v, " ρσ_module_doc__")), output.print(JSON.stringify((create_doctring?.__call__?.bind(create_doctring) ?? create_doctring)(self.docstrings)))];
                    output.end_statement();
                }
            };
write_docstrings.__module__ = "output.modules";
undefined;

            if (output.options.private_scope && is_main) {
                function f_main_function() {
                    output.print("function()");
                    function f_full_function() {
                        output.indent();
                        output.print("\"use strict\"");
                        output.end_statement();
                        (prologue?.__call__?.bind(prologue) ?? prologue)(self, output);
                        (write_imports?.__call__?.bind(write_imports) ?? write_imports)(self, output);
                        output.newline();
                        output.indent();
                        function f_function() {
                            output.print("function()");
                            function f_body() {
                                (write_main_name?.__call__?.bind(write_main_name) ?? write_main_name)(output);
                                output.newline();
                                (declare_vars?.__call__?.bind(declare_vars) ?? declare_vars)(self.localvars, output);
                                (display_body?.__call__?.bind(display_body) ?? display_body)(self.body, true, output);
                                output.newline();
                                (write_docstrings?.__call__?.bind(write_docstrings) ?? write_docstrings)();
                                if (self.comments_after && self.comments_after.length) {
                                    output.indent();
                                    (output_comments?.__call__?.bind(output_comments) ?? output_comments)(self.comments_after, output);
                                    output.newline();
                                }
                            };
f_body.__module__ = "output.modules";
undefined;

                            output.with_block(f_body);
                        };
f_function.__module__ = "output.modules";
undefined;

                        output.with_parens(f_function);
                        output.print("();");
                        output.newline();
                    };
f_full_function.__module__ = "output.modules";
undefined;

                    output.with_block(f_full_function);
                };
f_main_function.__module__ = "output.modules";
undefined;

                output.with_parens(f_main_function);
                output.print("();");
                output.print("");
            } else {
                if (is_main) {
                    (prologue?.__call__?.bind(prologue) ?? prologue)(self, output);
                    (write_imports?.__call__?.bind(write_imports) ?? write_imports)(self, output);
                    (write_main_name?.__call__?.bind(write_main_name) ?? write_main_name)(output);
                }
                (declare_vars?.__call__?.bind(declare_vars) ?? declare_vars)(self.localvars, output);
                (display_body?.__call__?.bind(display_body) ?? display_body)(self.body, true, output);
                if (self.comments_after && self.comments_after.length) {
                    (output_comments?.__call__?.bind(output_comments) ?? output_comments)(self.comments_after, output);
                }
            }
            (set_module_name?.__call__?.bind(set_module_name) ?? set_module_name)();
        };
print_top_level.__argnames__ = ["self", "output"];
print_top_level.__module__ = "output.modules";
undefined;

        function print_module(self, output) {
            (set_module_name?.__call__?.bind(set_module_name) ?? set_module_name)(self.module_id);
            function output_module(output) {
                (declare_vars?.__call__?.bind(declare_vars) ?? declare_vars)(self.localvars, output);
                (display_body?.__call__?.bind(display_body) ?? display_body)(self.body, true, output);
                (declare_exports?.__call__?.bind(declare_exports) ?? declare_exports)(self.module_id, self.exports, output, self.docstrings);
            };
output_module.__argnames__ = ["output"];
output_module.__module__ = "output.modules";
undefined;

            output.newline();
            output.indent();
            function f_print_module() {
                output.print("function()");
                function dump_the_logic_of_this_module() {
                    var okey, cached, cobj, cname, symdef, co, raw, keep_docstrings, beautify, cached_name;
                    (print_comments?.__call__?.bind(print_comments) ?? print_comments)(self, output);
                    if (output.options.write_name) {
                        output.indent();
                        output.print("var ");
                        output.assign("__name__");
                        output.print(ρσ_operator_add(ρσ_operator_add("\"", self.module_id), "\""));
                        output.semicolon();
                        output.newline();
                    }
                    function output_key(beautify, keep_docstrings) {
                        return ρσ_operator_add(ρσ_operator_add(ρσ_operator_add("beautify:", beautify), " keep_docstrings:"), keep_docstrings);
                    };
output_key.__argnames__ = ["beautify", "keep_docstrings"];
output_key.__module__ = "output.modules";
undefined;

                    okey = (output_key?.__call__?.bind(output_key) ?? output_key)(output.options.beautify, output.options.keep_docstrings);
                    if (self.is_cached && ρσ_in(okey, self.outputs)) {
                        output.print((ρσ_expr_temp = self.outputs)[(typeof okey === "number" && okey < 0) ? ρσ_expr_temp.length + okey : okey]);
                    } else {
                        (output_module?.__call__?.bind(output_module) ?? output_module)(output);
                        if (self.srchash && self.filename) {
                            cached = {"version":(get_compiler_version?.__call__?.bind(get_compiler_version) ?? get_compiler_version)(),"signature":self.srchash,"classes":Object.create(null),"baselib":self.baselib,"nonlocalvars":self.nonlocalvars,"imported_module_ids":self.imported_module_ids,"exports":ρσ_list_decorate([]),"outputs":Object.create(null),"discard_asserts":(bool?.__call__?.bind(bool) ?? bool)(output.options.discard_asserts)};
                            var ρσ_Iter129 = Object.keys(self.classes);
                            ρσ_Iter129 = ((typeof ρσ_Iter129[Symbol.iterator] === "function") ? (ρσ_Iter129 instanceof Map ? ρσ_Iter129.keys() : ρσ_Iter129) : Object.keys(ρσ_Iter129));
                            for (var ρσ_Index129 of ρσ_Iter129) {
                                cname = ρσ_Index129;
                                cobj = (ρσ_expr_temp = self.classes)[(typeof cname === "number" && cname < 0) ? ρσ_expr_temp.length + cname : cname];
                                (ρσ_expr_temp = cached.classes)[(typeof cname === "number" && cname < 0) ? ρσ_expr_temp.length + cname : cname] = {"name":{"name":cobj.name.name},"static":cobj.static,"bound":cobj.bound,"classvars":cobj.classvars};
                            }
                            var ρσ_Iter130 = self.exports;
                            ρσ_Iter130 = ((typeof ρσ_Iter130[Symbol.iterator] === "function") ? (ρσ_Iter130 instanceof Map ? ρσ_Iter130.keys() : ρσ_Iter130) : Object.keys(ρσ_Iter130));
                            for (var ρσ_Index130 of ρσ_Iter130) {
                                symdef = ρσ_Index130;
                                cached.exports.push({"name":symdef.name});
                            }
                            var ρσ_Iter131 = ρσ_list_decorate([ true, false ]);
                            ρσ_Iter131 = ((typeof ρσ_Iter131[Symbol.iterator] === "function") ? (ρσ_Iter131 instanceof Map ? ρσ_Iter131.keys() : ρσ_Iter131) : Object.keys(ρσ_Iter131));
                            for (var ρσ_Index131 of ρσ_Iter131) {
                                beautify = ρσ_Index131;
                                var ρσ_Iter132 = ρσ_list_decorate([ true, false ]);
                                ρσ_Iter132 = ((typeof ρσ_Iter132[Symbol.iterator] === "function") ? (ρσ_Iter132 instanceof Map ? ρσ_Iter132.keys() : ρσ_Iter132) : Object.keys(ρσ_Iter132));
                                for (var ρσ_Index132 of ρσ_Iter132) {
                                    keep_docstrings = ρσ_Index132;
                                    co = new OutputStream({"beautify":beautify,"keep_docstrings":keep_docstrings,"write_name":false,"discard_asserts":output.options.discard_asserts});
                                    co.with_indent(output.indentation(), (function() {
                                        var ρσ_anonfunc = function () {
                                            return (output_module?.__call__?.bind(output_module) ?? output_module)(co);                                        };
ρσ_anonfunc.__module__ = "output.modules";
undefined;
                                        return ρσ_anonfunc;
                                    })());
                                    raw = co.get();
                                    (ρσ_expr_temp = cached.outputs)[ρσ_bound_index((output_key?.__call__?.bind(output_key) ?? output_key)(beautify, keep_docstrings), ρσ_expr_temp)] = raw;
                                }
                            }
                            cached_name = (cache_file_name?.__call__?.bind(cache_file_name) ?? cache_file_name)(self.filename, output.options.module_cache_dir);
                            try {
                                if (cached_name) {
                                    (writefile?.__call__?.bind(writefile) ?? writefile)(cached_name, JSON.stringify(cached, null, "\t"));
                                }
                            } catch (ρσ_Exception) {
                                ρσ_last_exception = ρσ_Exception;
                                if (ρσ_Exception instanceof Error) {
                                    var e = ρσ_Exception;
                                    console.error("Failed to write output cache file:", cached_name, "with error:", e);
                                } else {
                                    throw ρσ_Exception;
                                }
                            }
                        }
                    }
                };
dump_the_logic_of_this_module.__module__ = "output.modules";
undefined;

                output.with_block(dump_the_logic_of_this_module);
            };
f_print_module.__module__ = "output.modules";
undefined;

            output.with_parens(f_print_module);
            output.print("()");
            output.semicolon();
            output.newline();
            (set_module_name?.__call__?.bind(set_module_name) ?? set_module_name)();
        };
print_module.__argnames__ = ["self", "output"];
print_module.__module__ = "output.modules";
undefined;

        function print_imports(container, output) {
            var is_first_aname, akey, argname, parts, q, ρσ_unpack, i, part, self;
            is_first_aname = true;
            function add_aname(aname, key, from_import) {
                if (is_first_aname) {
                    is_first_aname = false;
                } else {
                    output.indent();
                }
                output.print("var ");
                output.assign(aname);
                if (key.indexOf(".") === -1) {
                    [output.print("ρσ_modules."), output.print(key)];
                } else {
                    [output.print("ρσ_modules[\""), output.print(key), output.print("\"]")];
                }
                if (from_import) {
                    output.print(".");
                    output.print(from_import);
                }
                output.end_statement();
            };
add_aname.__argnames__ = ["aname", "key", "from_import"];
add_aname.__module__ = "output.modules";
undefined;

            var ρσ_Iter133 = container.imports;
            ρσ_Iter133 = ((typeof ρσ_Iter133[Symbol.iterator] === "function") ? (ρσ_Iter133 instanceof Map ? ρσ_Iter133.keys() : ρσ_Iter133) : Object.keys(ρσ_Iter133));
            for (var ρσ_Index133 of ρσ_Iter133) {
                self = ρσ_Index133;
                if (self.argnames) {
                    var ρσ_Iter134 = self.argnames;
                    ρσ_Iter134 = ((typeof ρσ_Iter134[Symbol.iterator] === "function") ? (ρσ_Iter134 instanceof Map ? ρσ_Iter134.keys() : ρσ_Iter134) : Object.keys(ρσ_Iter134));
                    for (var ρσ_Index134 of ρσ_Iter134) {
                        argname = ρσ_Index134;
                        akey = (argname.alias) ? argname.alias.name : argname.name;
                        (add_aname?.__call__?.bind(add_aname) ?? add_aname)(akey, self.key, argname.name);
                    }
                } else {
                    if (self.alias) {
                        (add_aname?.__call__?.bind(add_aname) ?? add_aname)(self.alias.name, self.key, false);
                    } else {
                        parts = self.key.split(".");
                        var ρσ_Iter135 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(parts);
                        ρσ_Iter135 = ((typeof ρσ_Iter135[Symbol.iterator] === "function") ? (ρσ_Iter135 instanceof Map ? ρσ_Iter135.keys() : ρσ_Iter135) : Object.keys(ρσ_Iter135));
                        for (var ρσ_Index135 of ρσ_Iter135) {
                            ρσ_unpack = ρσ_Index135;
                            i = ρσ_unpack[0];
                            part = ρσ_unpack[1];
                            if (i === 0) {
                                (add_aname?.__call__?.bind(add_aname) ?? add_aname)(part, part, false);
                            } else {
                                q = parts.slice(0, ρσ_operator_add(i, 1)).join(".");
                                output.indent();
                                output.spaced(q, "=", ρσ_operator_add(ρσ_operator_add("ρσ_modules[\"", q), "\"]"));
                                output.end_statement();
                            }
                        }
                    }
                }
            }
        };
print_imports.__argnames__ = ["container", "output"];
print_imports.__module__ = "output.modules";
undefined;

        ρσ_modules["output.modules"].write_imports = write_imports;
        ρσ_modules["output.modules"].write_main_name = write_main_name;
        ρσ_modules["output.modules"].declare_exports = declare_exports;
        ρσ_modules["output.modules"].prologue = prologue;
        ρσ_modules["output.modules"].print_top_level = print_top_level;
        ρσ_modules["output.modules"].print_module = print_module;
        ρσ_modules["output.modules"].print_imports = print_imports;
    })();

    (function(){
        var __name__ = "output.codegen";
        var noop = ρσ_modules.utils.noop;

        var PRECEDENCE = ρσ_modules.parse.PRECEDENCE;

        var AST_Array = ρσ_modules.ast_types.AST_Array;
        var AST_Assign = ρσ_modules.ast_types.AST_Assign;
        var AST_BaseCall = ρσ_modules.ast_types.AST_BaseCall;
        var AST_Binary = ρσ_modules.ast_types.AST_Binary;
        var AST_BlockStatement = ρσ_modules.ast_types.AST_BlockStatement;
        var AST_Break = ρσ_modules.ast_types.AST_Break;
        var AST_Class = ρσ_modules.ast_types.AST_Class;
        var AST_Conditional = ρσ_modules.ast_types.AST_Conditional;
        var AST_Constant = ρσ_modules.ast_types.AST_Constant;
        var AST_Continue = ρσ_modules.ast_types.AST_Continue;
        var AST_Debugger = ρσ_modules.ast_types.AST_Debugger;
        var AST_Definitions = ρσ_modules.ast_types.AST_Definitions;
        var AST_Directive = ρσ_modules.ast_types.AST_Directive;
        var AST_Do = ρσ_modules.ast_types.AST_Do;
        var AST_Dot = ρσ_modules.ast_types.AST_Dot;
        var is_node_type = ρσ_modules.ast_types.is_node_type;
        var AST_EllipsesRange = ρσ_modules.ast_types.AST_EllipsesRange;
        var AST_EmptyStatement = ρσ_modules.ast_types.AST_EmptyStatement;
        var AST_Exit = ρσ_modules.ast_types.AST_Exit;
        var AST_ExpressiveObject = ρσ_modules.ast_types.AST_ExpressiveObject;
        var AST_ForIn = ρσ_modules.ast_types.AST_ForIn;
        var AST_ForJS = ρσ_modules.ast_types.AST_ForJS;
        var AST_Function = ρσ_modules.ast_types.AST_Function;
        var AST_Hole = ρσ_modules.ast_types.AST_Hole;
        var AST_If = ρσ_modules.ast_types.AST_If;
        var AST_Imports = ρσ_modules.ast_types.AST_Imports;
        var AST_Infinity = ρσ_modules.ast_types.AST_Infinity;
        var AST_Lambda = ρσ_modules.ast_types.AST_Lambda;
        var AST_ListComprehension = ρσ_modules.ast_types.AST_ListComprehension;
        var AST_LoopControl = ρσ_modules.ast_types.AST_LoopControl;
        var AST_NaN = ρσ_modules.ast_types.AST_NaN;
        var AST_New = ρσ_modules.ast_types.AST_New;
        var AST_Node = ρσ_modules.ast_types.AST_Node;
        var AST_Number = ρσ_modules.ast_types.AST_Number;
        var AST_Object = ρσ_modules.ast_types.AST_Object;
        var AST_ObjectKeyVal = ρσ_modules.ast_types.AST_ObjectKeyVal;
        var AST_ObjectProperty = ρσ_modules.ast_types.AST_ObjectProperty;
        var AST_PropAccess = ρσ_modules.ast_types.AST_PropAccess;
        var AST_RegExp = ρσ_modules.ast_types.AST_RegExp;
        var AST_Return = ρσ_modules.ast_types.AST_Return;
        var AST_Set = ρσ_modules.ast_types.AST_Set;
        var AST_Seq = ρσ_modules.ast_types.AST_Seq;
        var AST_SimpleStatement = ρσ_modules.ast_types.AST_SimpleStatement;
        var AST_Splice = ρσ_modules.ast_types.AST_Splice;
        var AST_Statement = ρσ_modules.ast_types.AST_Statement;
        var AST_StatementWithBody = ρσ_modules.ast_types.AST_StatementWithBody;
        var AST_String = ρσ_modules.ast_types.AST_String;
        var AST_Sub = ρσ_modules.ast_types.AST_Sub;
        var AST_ItemAccess = ρσ_modules.ast_types.AST_ItemAccess;
        var AST_Symbol = ρσ_modules.ast_types.AST_Symbol;
        var AST_This = ρσ_modules.ast_types.AST_This;
        var AST_Throw = ρσ_modules.ast_types.AST_Throw;
        var AST_Toplevel = ρσ_modules.ast_types.AST_Toplevel;
        var AST_Try = ρσ_modules.ast_types.AST_Try;
        var AST_Unary = ρσ_modules.ast_types.AST_Unary;
        var AST_UnaryPrefix = ρσ_modules.ast_types.AST_UnaryPrefix;
        var AST_Undefined = ρσ_modules.ast_types.AST_Undefined;
        var AST_Var = ρσ_modules.ast_types.AST_Var;
        var AST_VarDef = ρσ_modules.ast_types.AST_VarDef;
        var AST_Assert = ρσ_modules.ast_types.AST_Assert;
        var AST_Verbatim = ρσ_modules.ast_types.AST_Verbatim;
        var AST_While = ρσ_modules.ast_types.AST_While;
        var AST_With = ρσ_modules.ast_types.AST_With;
        var AST_Yield = ρσ_modules.ast_types.AST_Yield;
        var TreeWalker = ρσ_modules.ast_types.TreeWalker;
        var AST_Existential = ρσ_modules.ast_types.AST_Existential;

        var print_try = ρσ_modules["output.exceptions"].print_try;

        var print_class = ρσ_modules["output.classes"].print_class;

        var print_array = ρσ_modules["output.literals"].print_array;
        var print_obj_literal = ρσ_modules["output.literals"].print_obj_literal;
        var print_object = ρσ_modules["output.literals"].print_object;
        var print_set = ρσ_modules["output.literals"].print_set;
        var print_regexp = ρσ_modules["output.literals"].print_regexp;

        var print_do_loop = ρσ_modules["output.loops"].print_do_loop;
        var print_while_loop = ρσ_modules["output.loops"].print_while_loop;
        var print_for_loop_body = ρσ_modules["output.loops"].print_for_loop_body;
        var print_for_in = ρσ_modules["output.loops"].print_for_in;
        var print_list_comprehension = ρσ_modules["output.loops"].print_list_comprehension;
        var print_ellipses_range = ρσ_modules["output.loops"].print_ellipses_range;

        var print_top_level = ρσ_modules["output.modules"].print_top_level;
        var print_imports = ρσ_modules["output.modules"].print_imports;

        var print_comments = ρσ_modules["output.comments"].print_comments;

        var print_getattr = ρσ_modules["output.operators"].print_getattr;
        var print_getitem = ρσ_modules["output.operators"].print_getitem;
        var print_rich_getitem = ρσ_modules["output.operators"].print_rich_getitem;
        var print_splice_assignment = ρσ_modules["output.operators"].print_splice_assignment;
        var print_unary_prefix = ρσ_modules["output.operators"].print_unary_prefix;
        var print_binary_op = ρσ_modules["output.operators"].print_binary_op;
        var print_assign = ρσ_modules["output.operators"].print_assign;
        var print_conditional = ρσ_modules["output.operators"].print_conditional;
        var print_seq = ρσ_modules["output.operators"].print_seq;
        var print_existential = ρσ_modules["output.operators"].print_existential;

        var print_function = ρσ_modules["output.functions"].print_function;
        var print_function_call = ρσ_modules["output.functions"].print_function_call;

        var print_bracketed = ρσ_modules["output.statements"].print_bracketed;
        var first_in_statement = ρσ_modules["output.statements"].first_in_statement;
        var force_statement = ρσ_modules["output.statements"].force_statement;
        var print_with = ρσ_modules["output.statements"].print_with;
        var print_assert = ρσ_modules["output.statements"].print_assert;

        var make_block = ρσ_modules["output.utils"].make_block;
        var make_num = ρσ_modules["output.utils"].make_num;

        function generate_code() {
            function DEFPRINT(nodetype, generator) {
                nodetype.prototype._codegen = generator;
            };
DEFPRINT.__argnames__ = ["nodetype", "generator"];
DEFPRINT.__module__ = "output.codegen";
undefined;

            function f_print_generate(stream, force_parens) {
                var self, generator;
                self = this;
                generator = self._codegen;
                stream.push_node(self);
                if (force_parens || self.needs_parens(stream)) {
                    stream.with_parens(f_comments_then_generator);
                    function f_comments_then_generator() {
                        self.add_comments(stream);
                        (generator?.__call__?.bind(generator) ?? generator)(self, stream);
                    };
f_comments_then_generator.__module__ = "output.codegen";
undefined;

                } else {
                    self.add_comments(stream);
                    (generator?.__call__?.bind(generator) ?? generator)(self, stream);
                }
                stream.pop_node();
            };
f_print_generate.__argnames__ = ["stream", "force_parens"];
f_print_generate.__module__ = "output.codegen";
undefined;

            AST_Node.prototype.print = f_print_generate;
            function add_comments(output) {
                if (!(is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(this, AST_Toplevel)) {
                    (print_comments?.__call__?.bind(print_comments) ?? print_comments)(this, output);
                }
            };
add_comments.__argnames__ = ["output"];
add_comments.__module__ = "output.codegen";
undefined;

            AST_Node.prototype.add_comments = add_comments;
            function PARENS(nodetype, func) {
                nodetype.prototype.needs_parens = func;
            };
PARENS.__argnames__ = ["nodetype", "func"];
PARENS.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Node, (function() {
                var ρσ_anonfunc = function () {
                    return false;                };
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Function, first_in_statement);
            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Object, first_in_statement);
            function f_unary(output) {
                var p;
                p = output.parent();
                return (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) && p.expression === this;
            };
f_unary.__argnames__ = ["output"];
f_unary.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Unary, f_unary);
            function f_seq(output) {
                var p;
                p = output.parent();
                return (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Unary) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_VarDef) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Dot) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_ObjectProperty) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Conditional);
            };
f_seq.__argnames__ = ["output"];
f_seq.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Seq, f_seq);
            function f_binary(output) {
                var p, po, pp, so, sp;
                p = output.parent();
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_BaseCall) && p.expression === this) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Unary)) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) && p.expression === this) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary)) {
                    po = p.operator;
                    pp = PRECEDENCE[(typeof po === "number" && po < 0) ? PRECEDENCE.length + po : po];
                    so = this.operator;
                    sp = PRECEDENCE[(typeof so === "number" && so < 0) ? PRECEDENCE.length + so : so];
                    if (pp > sp || pp === sp && this === p.right && !((so === po && (so === "*" || so === "&&" || so === "||")))) {
                        return true;
                    }
                }
            };
f_binary.__argnames__ = ["output"];
f_binary.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Binary, f_binary);
            function f_prop_access(output) {
                var p;
                p = output.parent();
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_New) && p.expression === this) {
                    try {
                        function error_on_base_call(node) {
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_BaseCall)) {
                                throw p;
                            }
                        };
error_on_base_call.__argnames__ = ["node"];
error_on_base_call.__module__ = "output.codegen";
undefined;

                        this.walk(new TreeWalker(error_on_base_call));
                    } catch (ρσ_Exception) {
                        ρσ_last_exception = ρσ_Exception;
                        {
                            return true;
                        } 
                    }
                }
            };
f_prop_access.__argnames__ = ["output"];
f_prop_access.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_PropAccess, f_prop_access);
            function f_base_call(output) {
                var p;
                p = output.parent();
                return (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_New) && p.expression === this;
            };
f_base_call.__argnames__ = ["output"];
f_base_call.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_BaseCall, f_base_call);
            function f_new(output) {
                var p;
                p = output.parent();
                if (this.args.length === 0 && ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) || (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_BaseCall) && p.expression === this)) {
                    return true;
                }
            };
f_new.__argnames__ = ["output"];
f_new.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_New, f_new);
            function f_number(output) {
                var p;
                p = output.parent();
                if (this.value < 0 && (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) && p.expression === this) {
                    return true;
                }
            };
f_number.__argnames__ = ["output"];
f_number.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Number, f_number);
            function f_nan(output) {
                var p;
                p = output.parent();
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) && p.expression === this) {
                    return true;
                }
            };
f_nan.__argnames__ = ["output"];
f_nan.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_NaN, f_nan);
            function assign_and_conditional_paren_rules(output) {
                var p;
                p = output.parent();
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Unary)) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Binary) && !((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Assign))) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_BaseCall) && p.expression === this) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_Conditional) && p.condition === this) {
                    return true;
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_PropAccess) && p.expression === this) {
                    return true;
                }
            };
assign_and_conditional_paren_rules.__argnames__ = ["output"];
assign_and_conditional_paren_rules.__module__ = "output.codegen";
undefined;

            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Assign, assign_and_conditional_paren_rules);
            (PARENS?.__call__?.bind(PARENS) ?? PARENS)(AST_Conditional, assign_and_conditional_paren_rules);
            function f_directive(self, output) {
                output.print_string(self.value);
                output.semicolon();
            };
f_directive.__argnames__ = ["self", "output"];
f_directive.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Directive, f_directive);
            function f_debugger(self, output) {
                output.print("debugger");
                output.semicolon();
            };
f_debugger.__argnames__ = ["self", "output"];
f_debugger.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Debugger, f_debugger);
            AST_StatementWithBody.prototype._do_print_body = (function() {
                var ρσ_anonfunc = function (output) {
                    return (force_statement?.__call__?.bind(force_statement) ?? force_statement)(this.body, output);                };
ρσ_anonfunc.__argnames__ = ["output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })();
            function f_statement(self, output) {
                self.body.print(output);
                output.semicolon();
            };
f_statement.__argnames__ = ["self", "output"];
f_statement.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Statement, f_statement);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Toplevel, print_top_level);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Imports, print_imports);
            function f_simple_statement(self, output) {
                if (!((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.body, AST_EmptyStatement))) {
                    self.body.print(output);
                    output.semicolon();
                }
            };
f_simple_statement.__argnames__ = ["self", "output"];
f_simple_statement.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_SimpleStatement, f_simple_statement);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_BlockStatement, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return (print_bracketed?.__call__?.bind(print_bracketed) ?? print_bracketed)(self, output);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_EmptyStatement, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return null;                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Do, print_do_loop);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_While, print_while_loop);
            AST_ForIn.prototype._do_print_body = print_for_loop_body;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ForIn, print_for_in);
            function f_do_print_body(output) {
                var self;
                self = this;
                function f_print_stmt() {
                    var stmt;
                    var ρσ_Iter136 = self.body.body;
                    ρσ_Iter136 = ((typeof ρσ_Iter136[Symbol.iterator] === "function") ? (ρσ_Iter136 instanceof Map ? ρσ_Iter136.keys() : ρσ_Iter136) : Object.keys(ρσ_Iter136));
                    for (var ρσ_Index136 of ρσ_Iter136) {
                        stmt = ρσ_Index136;
                        output.indent();
                        stmt.print(output);
                        output.newline();
                    }
                };
f_print_stmt.__module__ = "output.codegen";
undefined;

                output.with_block(f_print_stmt);
            };
f_do_print_body.__argnames__ = ["output"];
f_do_print_body.__module__ = "output.codegen";
undefined;

            AST_ForJS.prototype._do_print_body = f_do_print_body;
            function f_for_js(self, output) {
                output.print("for");
                output.space();
                output.with_parens((function() {
                    var ρσ_anonfunc = function () {
                        return self.condition.print(output);                    };
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                    return ρσ_anonfunc;
                })());
                output.space();
                self._do_print_body(output);
            };
f_for_js.__argnames__ = ["self", "output"];
f_for_js.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ForJS, f_for_js);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ListComprehension, print_list_comprehension);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_EllipsesRange, print_ellipses_range);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_With, print_with);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Assert, print_assert);
            AST_Lambda.prototype._do_print = print_function;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Lambda, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            AST_Class.prototype._do_print = print_class;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Class, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            function f_do_print_exit(output, kind) {
                var self;
                self = this;
                output.print(kind);
                if (self.value) {
                    output.space();
                    self.value.print(output);
                }
                output.semicolon();
            };
f_do_print_exit.__argnames__ = ["output", "kind"];
f_do_print_exit.__module__ = "output.codegen";
undefined;

            AST_Exit.prototype._do_print = f_do_print_exit;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Yield, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, ρσ_operator_add("yield", ((self.is_yield_from) ? "*" : "")));                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Return, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, "return");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Throw, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, "throw");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            function f_do_print_loop(output, kind) {
                output.print(kind);
                if (this.label) {
                    output.space();
                    this.label.print(output);
                }
                output.semicolon();
            };
f_do_print_loop.__argnames__ = ["output", "kind"];
f_do_print_loop.__module__ = "output.codegen";
undefined;

            AST_LoopControl.prototype._do_print = f_do_print_loop;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Break, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, "break");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Continue, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, "continue");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            function make_then(self, output) {
                var b;
                if (output.options.bracketize) {
                    (make_block?.__call__?.bind(make_block) ?? make_block)(self.body, output);
                    return;
                }
                if (!self.body) {
                    return output.force_semicolon();
                }
                if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(self.body, AST_Do) && output.options.ie_proof) {
                    (make_block?.__call__?.bind(make_block) ?? make_block)(self.body, output);
                    return;
                }
                b = self.body;
                while (true) {
                    if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(b, AST_If)) {
                        if (!b.alternative) {
                            (make_block?.__call__?.bind(make_block) ?? make_block)(self.body, output);
                            return;
                        }
                        b = b.alternative;
                    } else if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(b, AST_StatementWithBody)) {
                        b = b.body;
                    } else {
                        break;
                    }
                }
                (force_statement?.__call__?.bind(force_statement) ?? force_statement)(self.body, output);
            };
make_then.__argnames__ = ["self", "output"];
make_then.__module__ = "output.codegen";
undefined;

            function f_if(self, output) {
                output.print("if");
                output.space();
                output.with_parens((function() {
                    var ρσ_anonfunc = function () {
                        return self.condition.print(output);                    };
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                    return ρσ_anonfunc;
                })());
                output.space();
                if (self.alternative) {
                    (make_then?.__call__?.bind(make_then) ?? make_then)(self, output);
                    output.space();
                    output.print("else");
                    output.space();
                    (force_statement?.__call__?.bind(force_statement) ?? force_statement)(self.alternative, output);
                } else {
                    self._do_print_body(output);
                }
            };
f_if.__argnames__ = ["self", "output"];
f_if.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_If, f_if);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Try, print_try);
            function f_do_print_definition(output, kind) {
                var ρσ_unpack, i, def_, p, in_for, avoid_semicolon;
                output.print(kind);
                output.space();
                var ρσ_Iter137 = (enumerate?.__call__?.bind(enumerate) ?? enumerate)(this.definitions);
                ρσ_Iter137 = ((typeof ρσ_Iter137[Symbol.iterator] === "function") ? (ρσ_Iter137 instanceof Map ? ρσ_Iter137.keys() : ρσ_Iter137) : Object.keys(ρσ_Iter137));
                for (var ρσ_Index137 of ρσ_Iter137) {
                    ρσ_unpack = ρσ_Index137;
                    i = ρσ_unpack[0];
                    def_ = ρσ_unpack[1];
                    if (i) {
                        output.comma();
                    }
                    def_.print(output);
                }
                p = output.parent();
                in_for = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_ForIn);
                avoid_semicolon = in_for && p.init === this;
                if (!avoid_semicolon) {
                    output.semicolon();
                }
            };
f_do_print_definition.__argnames__ = ["output", "kind"];
f_do_print_definition.__module__ = "output.codegen";
undefined;

            AST_Definitions.prototype._do_print = f_do_print_definition;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Var, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output, "var");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            function parenthesize_for_noin(node, output, noin) {
                if (!noin) {
                    node.print(output);
                } else {
                    try {
                        function f_for_noin(node) {
                            if ((is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(node, AST_Binary) && node.operator === "in") {
                                throw output;
                            }
                        };
f_for_noin.__argnames__ = ["node"];
f_for_noin.__module__ = "output.codegen";
undefined;

                        node.walk(new TreeWalker(f_for_noin));
                        node.print(output);
                    } catch (ρσ_Exception) {
                        ρσ_last_exception = ρσ_Exception;
                        {
                            node.print(output, true);
                        } 
                    }
                }
            };
parenthesize_for_noin.__argnames__ = ["node", "output", "noin"];
parenthesize_for_noin.__module__ = "output.codegen";
undefined;

            function f_print_var_def(self, output) {
                var p, noin;
                self.name.print(output);
                if (self.value) {
                    output.assign("");
                    p = output.parent(1);
                    noin = (is_node_type?.__call__?.bind(is_node_type) ?? is_node_type)(p, AST_ForIn);
                    (parenthesize_for_noin?.__call__?.bind(parenthesize_for_noin) ?? parenthesize_for_noin)(self.value, output, noin);
                }
            };
f_print_var_def.__argnames__ = ["self", "output"];
f_print_var_def.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_VarDef, f_print_var_def);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_BaseCall, print_function_call);
            AST_Seq.prototype._do_print = print_seq;
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Seq, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return self._do_print(output);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Dot, print_getattr);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Sub, print_getitem);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ItemAccess, print_rich_getitem);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Splice, print_splice_assignment);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_UnaryPrefix, print_unary_prefix);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Binary, print_binary_op);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Existential, print_existential);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Assign, print_assign);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Conditional, print_conditional);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Array, print_array);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ExpressiveObject, print_obj_literal);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Object, print_object);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_ObjectKeyVal, f_print_obj_key_val);
            function f_print_obj_key_val(self, output) {
                self.key.print(output);
                output.colon();
                self.value.print(output);
            };
f_print_obj_key_val.__argnames__ = ["self", "output"];
f_print_obj_key_val.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Set, print_set);
            AST_Symbol.prototype.definition = (function() {
                var ρσ_anonfunc = function () {
                    return this.thedef;                };
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })();
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Symbol, f_print_symbol);
            function f_print_symbol(self, output) {
                var def_;
                def_ = self.definition();
                output.print_name((def_) ? def_.mangled_name || def_.name : self.name);
            };
f_print_symbol.__argnames__ = ["self", "output"];
f_print_symbol.__module__ = "output.codegen";
undefined;

            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Undefined, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print("void 0");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Hole, noop);
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Infinity, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print("1/0");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_NaN, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print("0/0");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_This, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print("this");                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Constant, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print(self.value);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_String, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print_string(self.value);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Verbatim, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print(self.value);                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_Number, (function() {
                var ρσ_anonfunc = function (self, output) {
                    return output.print((make_num?.__call__?.bind(make_num) ?? make_num)(self.value));                };
ρσ_anonfunc.__argnames__ = ["self", "output"];
ρσ_anonfunc.__module__ = "output.codegen";
undefined;
                return ρσ_anonfunc;
            })());
            (DEFPRINT?.__call__?.bind(DEFPRINT) ?? DEFPRINT)(AST_RegExp, print_regexp);
        };
generate_code.__module__ = "output.codegen";
undefined;

        ρσ_modules["output.codegen"].generate_code = generate_code;
    })();

    (function(){

        var __name__ = "__main__";


        var ast, ast_node;
        var DefaultsError = ρσ_modules.utils.DefaultsError;
        var string_template = ρσ_modules.utils.string_template;

        var ImportError = ρσ_modules.errors.ImportError;
        var SyntaxError = ρσ_modules.errors.SyntaxError;

        var ALL_KEYWORDS = ρσ_modules.tokenizer.ALL_KEYWORDS;
        var IDENTIFIER_PAT = ρσ_modules.tokenizer.IDENTIFIER_PAT;
        var tokenizer = ρσ_modules.tokenizer.tokenizer;

        var parse = ρσ_modules.parse.parse;
        var NATIVE_CLASSES = ρσ_modules.parse.NATIVE_CLASSES;
        var compile_time_decorators = ρσ_modules.parse.compile_time_decorators;

        var OutputStream = ρσ_modules["output.stream"].OutputStream;

        var generate_code = ρσ_modules["output.codegen"].generate_code;

        (generate_code?.__call__?.bind(generate_code) ?? generate_code)();
        if (typeof exports === "object") {
            exports.DefaultsError = DefaultsError;
            exports.parse = parse;
            exports.compile_time_decorators = compile_time_decorators;
            exports.OutputStream = OutputStream;
            exports.string_template = string_template;
            exports.ALL_KEYWORDS = ALL_KEYWORDS;
            exports.IDENTIFIER_PAT = IDENTIFIER_PAT;
            exports.NATIVE_CLASSES = NATIVE_CLASSES;
            exports.ImportError = ImportError;
            exports.SyntaxError = SyntaxError;
            exports.tokenizer = tokenizer;
            ast = ρσ_modules["ast_types"];
            var ρσ_Iter138 = ast;
            ρσ_Iter138 = ((typeof ρσ_Iter138[Symbol.iterator] === "function") ? (ρσ_Iter138 instanceof Map ? ρσ_Iter138.keys() : ρσ_Iter138) : Object.keys(ρσ_Iter138));
            for (var ρσ_Index138 of ρσ_Iter138) {
                ast_node = ρσ_Index138;
                if (ast_node.substr(0, 4) === "AST_") {
                    exports[(typeof ast_node === "number" && ast_node < 0) ? exports.length + ast_node : ast_node] = ast[(typeof ast_node === "number" && ast_node < 0) ? ast.length + ast_node : ast_node];
                }
            }
        }
    })();
})();