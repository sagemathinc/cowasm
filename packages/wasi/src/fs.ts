/*
Create a union filesystem as described by a FileSystemSpec[].

This code should not depend on anything that must run in node.js.

Note that this is entirely synchronous code, e.g., the unzip code,
and that's justified because our WASM interpreter will likely get
run in a different thread (a webworker) than the main thread, and
this code is needed to initialize it before anything else can happen.

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
- make fs.constants be native's constants for the final export, so we can assume all calls into the
  filesystem are using the native constants.  Also, posix/libc code will of course assume native
  constants, since they use the constants from header files. WAIT... web assembly actually would have
  one specific choice cross platform! What is it?
- in the node api, the ONLY functions that take numeric flags are open and openSync.  That's convenient!
- somehow figure out which filesystem (native or memfs for now) that a given open will go to, and 
  convert the flags if going to memfs.
*/

import unzip from "./unzip";
import { Volume, createFsFromVolume, fs as memfs, DirectoryJSON } from "memfs";
import { Union } from "unionfs";
import type { WASIBindings } from "./types";

export type FileSystem = any; // TODO -- what exactly do we need?

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
}

interface ZipFsUrl {
  // has to be converted to ZipFs before passed in here.
  type: "zipurl";
  zipurl: string;
  mountpoint: string;
}

interface ZipFs {
  type: "zip";
  data: Buffer;
  mountpoint: string;
}

interface MemFs {
  type: "mem";
  contents?: DirectoryJSON;
}

export type FileSystemSpec =
  | NativeFs
  | ZipFs
  | ZipFsFile
  | ZipFsUrl
  | MemFs
  | DevFs;

export function createFileSystem(
  specs: FileSystemSpec[],
  bindings: WASIBindings
): FileSystem {
  const ufs = new Union();
  (ufs as any).constants = memfs.constants;
  if (specs.length == 0) {
    return memFs() as any; // empty memfs
  }
  if (specs.length == 1) {
    // don't use unionfs:
    return specToFs(specs[0], bindings);
  }
  for (const spec of specs) {
    const fs: any = specToFs(spec, bindings);
    if (fs != null) {
      // e.g., native bindings may be null.
      ufs.use(fs);
    }
  }
  return ufs as any;
}

function specToFs(spec: FileSystemSpec, bindings: WASIBindings): FileSystem {
  // All these "as any" are because really nothing quite implements FileSystem yet!
  // See https://github.com/streamich/memfs/issues/735
  if (spec.type == "zip") {
    return zipFs(spec.data, spec.mountpoint) as any;
  } else if (spec.type == "zipfile") {
    throw Error(`you must convert zipfile -- read ${spec.zipfile} into memory`);
  } else if (spec.type == "zipurl") {
    throw Error(`you must convert zipurl -- read ${spec.zipurl} into memory`);
  } else if (spec.type == "native") {
    // native = whatever is in bindings.
    return bindings.fs as any;
  } else if (spec.type == "mem") {
    return memFs(spec.contents) as any;
  } else if (spec.type == "dev") {
    return devFs() as any;
  }
  throw Error(`unknown spec type - ${JSON.stringify(spec)}`);
}

// this is generic and would work in a browser:
function devFs() {
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
  return createFsFromVolume(vol);
}

function zipFs(data: Buffer, directory: string = "/") {
  const fs = createFsFromVolume(new Volume()) as any;
  unzip({ data, fs, directory });
  return fs;
}

function memFs(contents?: DirectoryJSON) {
  const vol = contents != null ? Volume.fromJSON(contents) : new Volume();
  return createFsFromVolume(vol);
}
