import WASI from "wasi-js";
import type { FileSystemSpec, WASIConfig, WASIBindings } from "wasi-js";
import reuseInFlight from "../reuseInFlight";
import WasmInstanceSync from "./instance";
import importWebAssemblyDlopen, {
  MBtoPages,
  Options as DylinkOptions,
} from "dylink";
import initPythonTrampolineCalls from "./trampoline";
import debug from "debug";
import PosixContext from "./posix-context";

const log = debug("wasm-worker");

export function strlen(charPtr: number, memory: WebAssembly.Memory): number {
  const mem = new Uint8Array(memory.buffer);
  let i = charPtr;
  while (mem[i]) {
    i += 1;
  }
  return i - charPtr;
}

export interface Options {
  wasmEnv?: { [name: string]: Function }; // functions to include in the environment
  env?: { [name: string]: string }; // environment variables
  time?: boolean;
  sleep?: (milliseconds: number) => void;
  stdinBuffer?: SharedArrayBuffer;
  signalBuffer?: SharedArrayBuffer;
  getStdin?: () => Buffer;
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
  fs?: FileSystemSpec[]; // only used in node.ts and browser.ts right now.  (TODO: this is due to refactoring)
  locks?: {
    spinLockBuffer: SharedArrayBuffer;
    stdinLockBuffer: SharedArrayBuffer;
  };
  noStdio?: boolean;
}

const cache: { [name: string]: any } = {};

type WasmImportFunction = typeof doWasmImport;

async function doWasmImport({
  source,
  bindings,
  options = {},
  importWebAssemblySync,
  importWebAssembly,
  readFileSync,
  maxMemoryMB,
}: {
  source: string; // path/url to the source
  bindings: WASIBindings;
  options: Options;
  importWebAssemblySync: (
    path: string,
    opts: WebAssembly.Imports
  ) => WebAssembly.Instance;
  importWebAssembly: (
    path: string,
    opts: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  readFileSync;
  maxMemoryMB?: number;
}): Promise<WasmInstanceSync> {
  log("doWasmImport", source);
  if (source == null) {
    throw Error("source must be defined");
  }
  if (cache[source] != null) {
    return cache[source];
  }
  const t = new Date().valueOf();

  const memory = new WebAssembly.Memory({
    initial: MBtoPages(10),
    ...(maxMemoryMB ? { maximum: MBtoPages(maxMemoryMB) } : {}),
  });
  const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });

  const wasmEnv = {
    reportError: (ptr, len: number) => {
      // @ts-ignore
      const slice = memory.buffer.slice(ptr, ptr + len);
      const textDecoder = new TextDecoder();
      throw Error(textDecoder.decode(slice));
    },
  };

  // NOTE: if we want to try to use WebAssembly.Table for something,
  // then set env.__indirect_function_table to it.  The name
  // __indirect_function_table is the arbitrary hardcoded name that zig
  // just happens to use for the table it imports when you compile
  // with --import-table. I only figured this out by decompiling and reading. See
  // https://github.com/ziglang/zig/pull/10382/files#diff-e2879374d581d6e9422f4f6f09ae3c8ee5f429f7581d7b899f3863319afff4e0R648
  const wasmOpts: any = {
    env: {
      ...wasmEnv,
      ...options.wasmEnv,
      memory,
      __indirect_function_table: table,
    },
  };

  let wasm;

  if (wasmOpts.env.wasmGetSignalState == null) {
    console.warn("wasmGetSignalState not defined; using STUB");
    wasmOpts.env.wasmGetSignalState = () => {
      return 0;
    };
  }
  if (wasmOpts.env.wasmSendString == null) {
    // This sends a string from WebAssembly back to Typescript and places
    // it in the result variable.
    wasmOpts.env.wasmSendString = (ptr: number, len: number) => {
      wasm.result = wasm.recv.string(ptr, len);
    };
  }
  if (wasmOpts.env.wasmSetException == null) {
    wasmOpts.env.wasmSetException = () => {
      wasm.resultException = true;
    };
  }
  if (wasmOpts.env.getrandom == null) {
    // TODO: didn't need to do this get fixed in newer zig?
    wasmOpts.env.getrandom = (bufPtr, bufLen, _flags) => {
      // NOTE: returning 0 here (our default stub behavior)
      // would result in Python hanging on startup!
      bindings.randomFillSync(
        // @ts-ignore
        new Uint8Array(memory.buffer),
        bufPtr,
        bufLen
      );
      return bufLen;
    };
  }
  if (wasmOpts.env.memset == null) {
    wasmOpts.env.memset = (ptr: number, value: number, len: number) => {
      new Uint8Array(memory.buffer).fill(value & 0xff, ptr, ptr + len);
      return ptr;
    };
  }
  if (wasmOpts.env.memcpy == null) {
    wasmOpts.env.memcpy = (dest: number, src: number, len: number) => {
      const mem = new Uint8Array(memory.buffer);
      mem.set(mem.slice(src, src + len), dest);
      return dest;
    };
  }
  if (wasmOpts.env.memmove == null) {
    wasmOpts.env.memmove = wasmOpts.env.memcpy;
  }
  if (wasmOpts.env.backtrace == null) {
    wasmOpts.env.backtrace = () => 0;
  }
  if (wasmOpts.env.backtrace_symbols_fd == null) {
    wasmOpts.env.backtrace_symbols_fd = () => {};
  }
  if (wasmOpts.env.__assert_fail == null) {
    wasmOpts.env.__assert_fail = () => {
      wasmOpts.env.abort();
    };
  }
  const cstringLength = (ptr: number, maxLen?: number) => {
    const mem = new Uint8Array(memory.buffer);
    let len = 0;
    while (ptr + len < mem.byteLength && mem[ptr + len] != 0) {
      len += 1;
      if (maxLen != null && len >= maxLen) break;
    }
    return len;
  };
  const compareBytes = (left: number, right: number, maxLen?: number) => {
    const mem = new Uint8Array(memory.buffer);
    let i = 0;
    while (maxLen == null || i < maxLen) {
      const a = mem[left + i] ?? 0;
      const b = mem[right + i] ?? 0;
      if (a != b) return a - b;
      if (a == 0) return 0;
      i += 1;
    }
    return 0;
  };
  const writeEndPtr = (endPtr: number, value: number) => {
    if (endPtr != 0) {
      new DataView(memory.buffer).setUint32(endPtr, value, true);
    }
  };
  const cDigit = (c: number): number => {
    if (c >= 48 && c <= 57) return c - 48;
    if (c >= 65 && c <= 90) return c - 65 + 10;
    if (c >= 97 && c <= 122) return c - 97 + 10;
    return -1;
  };
  const isSpace = (c: number): boolean =>
    c == 32 || (c >= 9 && c <= 13);
  const parseInteger = (nptr: number, endPtr: number, base: number): number => {
    const mem = new Uint8Array(memory.buffer);
    let p = nptr;
    while (isSpace(mem[p] ?? 0)) p += 1;
    let sign = 1;
    if (mem[p] == 43 || mem[p] == 45) {
      sign = mem[p] == 45 ? -1 : 1;
      p += 1;
    }
    if (base == 0) {
      base = 10;
      if (mem[p] == 48 && (mem[p + 1] == 120 || mem[p + 1] == 88)) {
        base = 16;
        p += 2;
      } else if (mem[p] == 48) {
        base = 8;
      }
    } else if (
      base == 16 &&
      mem[p] == 48 &&
      (mem[p + 1] == 120 || mem[p + 1] == 88)
    ) {
      p += 2;
    }
    let value = 0;
    let last = nptr;
    while (p < mem.byteLength) {
      const digit = cDigit(mem[p] ?? 0);
      if (digit < 0 || digit >= base) break;
      value = value * base + digit;
      p += 1;
      last = p;
    }
    writeEndPtr(endPtr, last);
    return sign * value;
  };
  const parseFloatNumber = (nptr: number, endPtr: number): number => {
    const text = wasm.recv.string(nptr, cstringLength(nptr, 256));
    const match = text.match(/^[\t\n\v\f\r ]*[+-]?(?:Infinity|NaN|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
    if (match == null) {
      writeEndPtr(endPtr, nptr);
      return 0;
    }
    writeEndPtr(endPtr, nptr + match[0].length);
    return Number(match[0]);
  };
  if (wasmOpts.env.strlen == null) {
    wasmOpts.env.strlen = (ptr: number) => cstringLength(ptr);
  }
  if (wasmOpts.env.memcmp == null) {
    wasmOpts.env.memcmp = (left: number, right: number, len: number) => {
      const mem = new Uint8Array(memory.buffer);
      for (let i = 0; i < len; i++) {
        const a = mem[left + i] ?? 0;
        const b = mem[right + i] ?? 0;
        if (a != b) return a - b;
      }
      return 0;
    };
  }
  if (wasmOpts.env.memchr == null) {
    wasmOpts.env.memchr = (ptr: number, value: number, len: number) => {
      const mem = new Uint8Array(memory.buffer);
      const byte = value & 0xff;
      for (let i = 0; i < len; i++) {
        if (mem[ptr + i] == byte) return ptr + i;
      }
      return 0;
    };
  }
  if (wasmOpts.env.strcmp == null) {
    wasmOpts.env.strcmp = (left: number, right: number) =>
      compareBytes(left, right);
  }
  if (wasmOpts.env.strncmp == null) {
    wasmOpts.env.strncmp = (left: number, right: number, len: number) =>
      compareBytes(left, right, len);
  }
  if (wasmOpts.env.strcasecmp == null) {
    wasmOpts.env.strcasecmp = (left: number, right: number) => {
      const mem = new Uint8Array(memory.buffer);
      let i = 0;
      while (true) {
        let a = mem[left + i] ?? 0;
        let b = mem[right + i] ?? 0;
        if (a >= 65 && a <= 90) a += 32;
        if (b >= 65 && b <= 90) b += 32;
        if (a != b) return a - b;
        if (a == 0) return 0;
        i += 1;
      }
    };
  }
  if (wasmOpts.env.isalnum == null) {
    wasmOpts.env.isalnum = (c: number) =>
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122)
        ? 1
        : 0;
  }
  if (wasmOpts.env.isdigit == null) {
    wasmOpts.env.isdigit = (c: number) => (c >= 48 && c <= 57 ? 1 : 0);
  }
  if (wasmOpts.env.isspace == null) {
    wasmOpts.env.isspace = (c: number) => (isSpace(c) ? 1 : 0);
  }
  if (wasmOpts.env.isxdigit == null) {
    wasmOpts.env.isxdigit = (c: number) => {
      const digit = cDigit(c);
      return digit >= 0 && digit < 16 ? 1 : 0;
    };
  }
  if (wasmOpts.env.tolower == null) {
    wasmOpts.env.tolower = (c: number) =>
      c >= 65 && c <= 90 ? c + 32 : c;
  }
  if (wasmOpts.env.toupper == null) {
    wasmOpts.env.toupper = (c: number) =>
      c >= 97 && c <= 122 ? c - 32 : c;
  }
  if (wasmOpts.env.tolower_l == null) {
    wasmOpts.env.tolower_l = (c: number) => wasmOpts.env.tolower(c);
  }
  if (wasmOpts.env.toupper_l == null) {
    wasmOpts.env.toupper_l = (c: number) => wasmOpts.env.toupper(c);
  }
  if (wasmOpts.env.iswspace_l == null) {
    wasmOpts.env.iswspace_l = (c: number) => wasmOpts.env.isspace(c);
  }
  if (wasmOpts.env.strcpy == null) {
    wasmOpts.env.strcpy = (dest: number, src: number) => {
      const mem = new Uint8Array(memory.buffer);
      const len = cstringLength(src);
      mem.set(mem.slice(src, src + len + 1), dest);
      return dest;
    };
  }
  if (wasmOpts.env.strdup == null) {
    wasmOpts.env.strdup = (src: number) => {
      let malloc = wasm?.exports?.malloc;
      if (typeof malloc != "function") {
        const mallocPtr = wasm?.exports?.__WASM_EXPORT__malloc;
        if (typeof mallocPtr == "function") {
          malloc = table.get(Number(mallocPtr()));
        }
      }
      if (typeof malloc != "function") {
        throw Error("strdup requires malloc from the main WebAssembly module");
      }
      const mem = new Uint8Array(memory.buffer);
      const len = cstringLength(src);
      const dest = Number(malloc(len + 1));
      if (dest == 0) return 0;
      mem.set(mem.slice(src, src + len + 1), dest);
      return dest;
    };
  }
  if (wasmOpts.env.strcat == null) {
    wasmOpts.env.strcat = (dest: number, src: number) => {
      wasmOpts.env.strcpy(dest + cstringLength(dest), src);
      return dest;
    };
  }
  if (wasmOpts.env.strncpy == null) {
    wasmOpts.env.strncpy = (dest: number, src: number, len: number) => {
      const mem = new Uint8Array(memory.buffer);
      const copyLen = Math.min(cstringLength(src), len);
      mem.set(mem.slice(src, src + copyLen), dest);
      mem.fill(0, dest + copyLen, dest + len);
      return dest;
    };
  }
  if (wasmOpts.env.strncat == null) {
    wasmOpts.env.strncat = (dest: number, src: number, len: number) => {
      const mem = new Uint8Array(memory.buffer);
      const destLen = cstringLength(dest);
      const copyLen = Math.min(cstringLength(src), len);
      mem.set(mem.slice(src, src + copyLen), dest + destLen);
      mem[dest + destLen + copyLen] = 0;
      return dest;
    };
  }
  if (wasmOpts.env.strchr == null) {
    wasmOpts.env.strchr = (ptr: number, value: number) => {
      const mem = new Uint8Array(memory.buffer);
      const byte = value & 0xff;
      let i = 0;
      while (ptr + i < mem.byteLength) {
        const c = mem[ptr + i];
        if (c == byte) return ptr + i;
        if (c == 0) return 0;
        i += 1;
      }
      return 0;
    };
  }
  if (wasmOpts.env.strrchr == null) {
    wasmOpts.env.strrchr = (ptr: number, value: number) => {
      const mem = new Uint8Array(memory.buffer);
      const byte = value & 0xff;
      let last = 0;
      let i = 0;
      while (ptr + i < mem.byteLength) {
        const c = mem[ptr + i];
        if (c == byte) last = ptr + i;
        if (c == 0) return byte == 0 ? ptr + i : last;
        i += 1;
      }
      return last;
    };
  }
  if (wasmOpts.env.strcspn == null) {
    wasmOpts.env.strcspn = (ptr: number, reject: number) => {
      const mem = new Uint8Array(memory.buffer);
      const rejected = new Set<number>();
      for (let i = 0; mem[reject + i] != 0; i++) rejected.add(mem[reject + i]);
      let len = 0;
      while (mem[ptr + len] != 0 && !rejected.has(mem[ptr + len])) len += 1;
      return len;
    };
  }
  if (wasmOpts.env.strspn == null) {
    wasmOpts.env.strspn = (ptr: number, accept: number) => {
      const mem = new Uint8Array(memory.buffer);
      const accepted = new Set<number>();
      for (let i = 0; mem[accept + i] != 0; i++) accepted.add(mem[accept + i]);
      let len = 0;
      while (mem[ptr + len] != 0 && accepted.has(mem[ptr + len])) len += 1;
      return len;
    };
  }
  if (wasmOpts.env.strpbrk == null) {
    wasmOpts.env.strpbrk = (ptr: number, accept: number) => {
      const mem = new Uint8Array(memory.buffer);
      const accepted = new Set<number>();
      for (let i = 0; mem[accept + i] != 0; i++) accepted.add(mem[accept + i]);
      let i = 0;
      while (mem[ptr + i] != 0) {
        if (accepted.has(mem[ptr + i])) return ptr + i;
        i += 1;
      }
      return 0;
    };
  }
  if (wasmOpts.env.strstr == null) {
    wasmOpts.env.strstr = (haystack: number, needle: number) => {
      const mem = new Uint8Array(memory.buffer);
      const needleLen = cstringLength(needle);
      if (needleLen == 0) return haystack;
      const haystackLen = cstringLength(haystack);
      for (let i = 0; i + needleLen <= haystackLen; i++) {
        let found = true;
        for (let j = 0; j < needleLen; j++) {
          if (mem[haystack + i + j] != mem[needle + j]) {
            found = false;
            break;
          }
        }
        if (found) return haystack + i;
      }
      return 0;
    };
  }
  if (wasmOpts.env.strtol == null) {
    wasmOpts.env.strtol = parseInteger;
  }
  if (wasmOpts.env.strtoul == null) {
    wasmOpts.env.strtoul = (nptr: number, endPtr: number, base: number) =>
      parseInteger(nptr, endPtr, base) >>> 0;
  }
  if (wasmOpts.env.strtoll == null) {
    wasmOpts.env.strtoll = (nptr: number, endPtr: number, base: number) =>
      BigInt(parseInteger(nptr, endPtr, base));
  }
  if (wasmOpts.env.strtoull == null) {
    wasmOpts.env.strtoull = (nptr: number, endPtr: number, base: number) =>
      BigInt(parseInteger(nptr, endPtr, base) >>> 0);
  }
  if (wasmOpts.env.strtod == null) {
    wasmOpts.env.strtod = parseFloatNumber;
  }
  if (wasmOpts.env.strtof == null) {
    wasmOpts.env.strtof = parseFloatNumber;
  }
  if (wasmOpts.env.strtold == null) {
    wasmOpts.env.strtold = (resultPtr: number, nptr: number, endPtr: number) => {
      parseFloatNumber(nptr, endPtr);
      new Uint8Array(memory.buffer).fill(0, resultPtr, resultPtr + 16);
    };
  }
  if (wasmOpts.env.strtold_l == null) {
    wasmOpts.env.strtold_l = (
      resultPtr: number,
      nptr: number,
      endPtr: number
    ) => {
      wasmOpts.env.strtold(resultPtr, nptr, endPtr);
    };
  }
  if (wasmOpts.env.atoi == null) {
    wasmOpts.env.atoi = (nptr: number) => parseInteger(nptr, 0, 10);
  }
  if (wasmOpts.env.atol == null) {
    wasmOpts.env.atol = wasmOpts.env.atoi;
  }
  if (wasmOpts.env.atoll == null) {
    wasmOpts.env.atoll = (nptr: number) => BigInt(parseInteger(nptr, 0, 10));
  }
  if (wasmOpts.env.atof == null) {
    wasmOpts.env.atof = (nptr: number) => parseFloatNumber(nptr, 0);
  }
  if (wasmOpts.env.localeconv == null) {
    wasmOpts.env.localeconv = () => 0;
  }
  const mathFns = {
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    atan2: Math.atan2,
    ceil: Math.ceil,
    cos: Math.cos,
    exp: Math.exp,
    fabs: Math.abs,
    floor: Math.floor,
    fmod: (x: number, y: number) => x % y,
    hypot: Math.hypot,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    pow: Math.pow,
    round: Math.round,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan,
    trunc: Math.trunc,
    truncate: Math.trunc,
  };
  for (const [name, fn] of Object.entries(mathFns)) {
    if (wasmOpts.env[name] == null) {
      wasmOpts.env[name] = fn;
    }
  }
  if (wasmOpts.env.main == null) {
    // TODO: this seems suspect
    wasmOpts.env.main = () => {
      return 0;
    };
  }

  if (wasmOpts.env._Py_emscripten == null) {
    // TODO: this seems suspect
    wasmOpts.env._Py_emscripten_runtime = () => {
      return 0;
    };
  }
  if (wasmOpts.env.emscripten_set_up_async_input_device_js == null) {
    wasmOpts.env.emscripten_set_up_async_input_device_js = () => {
      return 0;
    };
  }
  if (wasmOpts.env.emscripten_log_impl_js == null) {
    wasmOpts.env.emscripten_log_impl_js = () => {};
  }

  initPythonTrampolineCalls(table, wasmOpts.env);

  const { fs } = bindings;
  const wasiConfig: WASIConfig = {
    preopens: { "/": "/" },
    bindings,
    args: process.argv,
    env: options.env,
    sleep: options.sleep,
    getStdin: options.getStdin,
    sendStdout: options.sendStdout,
    sendStderr: options.sendStderr,
  };
  const wasi = new WASI(wasiConfig);
  wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;

  const writeImportedFd = (fd: 1 | 2, data: Buffer) => {
    if (data.byteLength == 0) return;
    const stats = wasi.FD_MAP.get(fd);
    if (
      fd == 1 &&
      options.sendStdout != null &&
      stats?.path == "/dev/stdout"
    ) {
      options.sendStdout(data);
      return;
    }
    if (
      fd == 2 &&
      options.sendStderr != null &&
      stats?.path == "/dev/stderr"
    ) {
      options.sendStderr(data);
      return;
    }
    bindings.fs.writeSync(stats?.real ?? fd, data, 0, data.byteLength, null);
  };

  const writeImportedStdio = (fd: 1 | 2, ptr: number, len: number) => {
    if (len <= 0) return;
    const data = Buffer.from(memory.buffer.slice(ptr, ptr + len));
    writeImportedFd(fd, data);
  };

  const streamFd = (stream: number): 0 | 1 | 2 => {
    const getStream = (name: "stdin" | "stdout" | "stderr") => {
      let ptr: number | undefined;
      try {
        ptr = wasm?.exports?.[`__WASM_EXPORT__${name}`]?.();
      } catch (_err) {
        ptr = undefined;
      }
      const value =
        ptr != null && ptr > 0 && ptr + 4 <= memory.buffer.byteLength
          ? new DataView(memory.buffer).getUint32(ptr, true)
          : undefined;
      return { ptr, value };
    };
    const stdout = getStream("stdout");
    if (stream === stdout.ptr || stream === stdout.value) {
      return 1;
    }
    const stdin = getStream("stdin");
    if (stream === stdin.ptr || stream === stdin.value) {
      return 0;
    }
    return 2;
  };
  const outputStreamFd = (stream: number): 1 | 2 => {
    return streamFd(stream) == 1 ? 1 : 2;
  };

  if (wasmOpts.env.fwrite == null) {
    wasmOpts.env.fwrite = (
      ptr: number,
      size: number,
      nmemb: number,
      stream: number
    ) => {
      writeImportedStdio(outputStreamFd(stream), ptr, size * nmemb);
      return nmemb;
    };
  }
  if (wasmOpts.env.fputc == null) {
    wasmOpts.env.fputc = (c: number, stream: number) => {
      const data = Buffer.from([c & 0xff]);
      writeImportedFd(outputStreamFd(stream), data);
      return c;
    };
  }
  if (wasmOpts.env.fputs == null) {
    wasmOpts.env.fputs = (ptr: number, stream: number) => {
      writeImportedStdio(outputStreamFd(stream), ptr, strlen(ptr, memory));
      return 0;
    };
  }
  if (wasmOpts.env.fiprintf == null) {
    wasmOpts.env.fiprintf = () => 0;
  }
  if (wasmOpts.env.siprintf == null) {
    wasmOpts.env.siprintf = () => 0;
  }
  if (wasmOpts.env.putchar == null) {
    wasmOpts.env.putchar = (c: number) => {
      wasmOpts.env.fputc(c, wasm?.exports?.__WASM_EXPORT__stdout?.() ?? 0);
      return c;
    };
  }
  if (wasmOpts.env.puts == null) {
    wasmOpts.env.puts = (ptr: number) => {
      writeImportedStdio(1, ptr, strlen(ptr, memory));
      const data = Buffer.from("\n");
      writeImportedFd(1, data);
      return 0;
    };
  }
  if (wasmOpts.env.fflush == null) {
    wasmOpts.env.fflush = () => 0;
  }
  if (wasmOpts.env.fileno == null) {
    wasmOpts.env.fileno = (stream: number) => streamFd(stream);
  }
  if (wasmOpts.env.fileno_unlocked == null) {
    wasmOpts.env.fileno_unlocked = wasmOpts.env.fileno;
  }
  if (wasmOpts.env.freopen == null) {
    wasmOpts.env.freopen = (_path: number, _mode: number, stream: number) =>
      stream;
  }
  if (wasmOpts.env.ferror == null) {
    wasmOpts.env.ferror = () => 0;
  }
  if (wasmOpts.env.clearerr == null) {
    wasmOpts.env.clearerr = () => {};
  }
  if (wasmOpts.env.setvbuf == null) {
    wasmOpts.env.setvbuf = () => 0;
  }
  if (wasmOpts.env.flockfile == null) {
    wasmOpts.env.flockfile = () => {};
  }
  if (wasmOpts.env.funlockfile == null) {
    wasmOpts.env.funlockfile = () => {};
  }

  const dylinkOptions = {
    importWebAssemblySync,
    importWebAssembly,
    readFileSync,
    stub: false,
  } as Pick<
    DylinkOptions,
    "importWebAssemblySync" | "importWebAssembly" | "readFileSync" | "stub"
  >;

  const posixContext = new PosixContext({
    memory,
    wasi,
    wasiConfig,
    noStdio: !!options.noStdio,
  });
  // This adds the posix functions into env *and* also adds socket
  // functionality to wasi_snapshot_preview1.
  posixContext.injectFunctions(wasmOpts);

  const instance = await importWebAssemblyDlopen({
    ...dylinkOptions,
    path: source,
    importObject: wasmOpts,
  } as DylinkOptions);

  if (wasi != null) {
    // wasi assumes this is called.
    wasi.start(instance, memory);
  }

  wasm = new WasmInstanceSync(instance, memory, fs, table);
  posixContext.init(wasm);

  cache[source] = wasm;

  if (options.time && log.enabled) {
    log(`imported ${source} in ${new Date().valueOf() - t}ms`);
  }
  wasm.table = table;
  wasm.wasi = wasi;
  wasm.posixContext = posixContext;
  wasm.instance = instance;

  return wasm;
}

const wasmImport: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});
export default wasmImport;
