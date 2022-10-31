/*
Create a union filesystem as described by a FileSystemSpec[].

This code should not depend on anything that must run in node.js.

Note that this is entirely synchronous code, e.g., the unzip code,
and that's justified because our WASM interpreter will likely get
run in a different thread (a webworker) than the main thread, and
this code is needed to initialize it before anything else can happen.
*/

import unzip from "./unzip";
import {
  Volume,
  createFsFromVolume,
  fs as memfs,
  DirectoryJSON,
} from "@cowasm/memfs";
import { Union } from "@wapython/unionfs";
import { WASIFileSystem } from "./types";

// The native filesystem
interface NativeFs {
  type: "native";
}

interface DevFs {
  type: "dev";
}

interface ZipFsFile {
  // has to be converted to ZipFs before passed in here.
  type: "zipfile";
  zipfile: string;
  mountpoint: string;
  async?: boolean; // if true, will load asynchronously in the background.
}

interface ZipFsUrl {
  // has to be converted to ZipFs before passed in here.
  type: "zipurl";
  zipurl: string;
  mountpoint: string;
  async?: boolean; // if true, will load asynchronously in the background.
}

interface ZipFs {
  type: "zip";
  data: Buffer;
  mountpoint: string;
}

interface ZipFsAsync {
  type: "zip-async";
  getData: () => Promise<Buffer>;
  mountpoint: string;
}

interface MemFs {
  type: "mem";
  contents?: DirectoryJSON;
}

export type FileSystemSpec =
  | NativeFs
  | ZipFs
  | ZipFsAsync
  | ZipFsFile
  | ZipFsUrl
  | MemFs
  | DevFs;

export function createFileSystem(
  specs: FileSystemSpec[],
  nativeFs?: WASIFileSystem
): WASIFileSystem {
  if (specs.length == 0) {
    return memFs(); // empty memfs
  }
  if (specs.length == 1) {
    // don't use unionfs:
    return specToFs(specs[0], nativeFs) ?? memFs();
  }
  const ufs = new Union();
  const v: Function[] = [];
  for (const spec of specs) {
    const fs = specToFs(spec, nativeFs);
    if (fs != null) {
      // e.g., native bindings may be null.
      ufs.use(fs);
      if (fs.waitUntilLoaded != null) {
        v.push(fs.waitUntilLoaded.bind(fs));
      }
    }
  }
  const waitUntilLoaded = async () => {
    for (const wait of v) {
      await wait();
    }
  };
  return { ...ufs, constants: memfs.constants, waitUntilLoaded };
}

function specToFs(
  spec: FileSystemSpec,
  nativeFs?: WASIFileSystem
): WASIFileSystem | undefined {
  // All these "as any" are because really nothing quite implements FileSystem yet!
  // See https://github.com/streamich/memfs/issues/735
  if (spec.type == "zip") {
    return zipFs(spec.data, spec.mountpoint) as any;
  } else if (spec.type == "zip-async") {
    return zipFsAsync(spec.getData, spec.mountpoint) as any;
  } else if (spec.type == "zipfile") {
    throw Error(`you must convert zipfile -- read ${spec.zipfile} into memory`);
  } else if (spec.type == "zipurl") {
    throw Error(`you must convert zipurl -- read ${spec.zipurl} into memory`);
  } else if (spec.type == "native") {
    // native = whatever is in bindings.
    return nativeFs == null ? nativeFs : mapFlags(nativeFs);
  } else if (spec.type == "mem") {
    return memFs(spec.contents) as any;
  } else if (spec.type == "dev") {
    return devFs() as any;
  }
  throw Error(`unknown spec type - ${JSON.stringify(spec)}`);
}

// this is generic and would work in a browser:
function devFs(): WASIFileSystem {
  const vol = Volume.fromJSON({
    "/dev/stdin": "",
    "/dev/stdout": "",
    "/dev/stderr": "",
  });
  vol.releasedFds = [0, 1, 2];
  const fdErr = vol.openSync("/dev/stderr", "w");
  const fdOut = vol.openSync("/dev/stdout", "w");
  const fdIn = vol.openSync("/dev/stdin", "r");
  if (fdErr != 2) throw Error(`invalid handle for stderr: ${fdErr}`);
  if (fdOut != 1) throw Error(`invalid handle for stdout: ${fdOut}`);
  if (fdIn != 0) throw Error(`invalid handle for stdin: ${fdIn}`);
  return createFsFromVolume(vol) as unknown as WASIFileSystem;
}

function zipFs(data: Buffer, directory: string = "/"): WASIFileSystem {
  const fs = createFsFromVolume(new Volume()) as any;
  fs.mkdirSync(directory, { recursive: true });
  unzip({ data, fs, directory });
  return fs;
}

function zipFsAsync(
  getData: () => Promise<Buffer>,
  directory: string = "/"
): WASIFileSystem {
  const fs = createFsFromVolume(new Volume()) as any;
  const load = async () => {
    let data;
    try {
      data = await getData();
    } catch (err) {
      console.warn(
        `FAILED to load async filesystem for '${directory}' - ${err}`
      );
      throw err;
    }
    // NOTE: there is an async version of this, but it runs in another
    // webworker and costs significant overhead, so not worth it.
    unzip({ data, fs, directory });
  };
  const loadingPromise = load();
  fs.waitUntilLoaded = () => loadingPromise;
  return fs;
}

function memFs(contents?: DirectoryJSON): WASIFileSystem {
  const vol = contents != null ? Volume.fromJSON(contents) : new Volume();
  return createFsFromVolume(vol) as unknown as WASIFileSystem;
}

function mapFlags(nativeFs: WASIFileSystem): WASIFileSystem {
  function translate(flags: number): number {
    // We have to translate the flags from WASM/memfs/musl to native for this operating system.
    // E.g., on MacOS many flags are completely different.  See big comment below.
    let nativeFlags = 0;
    for (const flag in memfs.constants) {
      // only flags starting with O_ are relevant for the open syscall.
      if (flag.startsWith("O_") && flags & memfs.constants[flag]) {
        nativeFlags |= nativeFs.constants[flag];
      }
    }
    return nativeFlags;
  }
  // "any" because there's something weird involving a __promises__ namespace that I don't understand.
  const open: any = async (path, flags, mode?) => {
    return await nativeFs.open(path, translate(flags), mode);
  };
  const openSync = (path, flags, mode?) => {
    return nativeFs.openSync(path, translate(flags), mode);
  };
  const promises = {
    ...nativeFs.promises,
    open: async (path, flags, mode?) => {
      return await nativeFs.promises.open(path, flags, mode);
    },
  };
  return {
    ...{ ...nativeFs, promises },
    open,
    openSync,
    constants: memfs.constants, // critical to ALWAYS use memfs constants for any filesystem.
  };
}

/*
Comment about flags:

A major subtle issue I hit is that unionfs combines filesystems, and
each filesystem can define fs.constants differently! In particular,
memfs always hardcodes constants.O_EXCL to be 128.  However, on
macos native filesystem it is 2048, whereas on Linux native filesystem
it is also 128.  We combine memfs and native for running python-wasm
under nodejs, since we want to use our Python install (that is in
dist/python/python.zip and mounted using memfs) along with full access
to the native filesystem.

I think the only good solution to this is the following:
- if native isn't part of the unionfs, nothing to do (since we only currently use native and memfs).
- fs.constants should be memfs's constants since I think they match with what WebAssembly libc (via musl)
  provides.
- in the node api, the ONLY functions that take numeric flags are open and openSync.  That's convenient!
- somehow figure out which filesystem (native or memfs for now) that a given open will go to, and
  convert the flags if going to memfs.

Probably the easiest way to accomplish all of the above is just use a proxy around native fs's
open* function.
*/
