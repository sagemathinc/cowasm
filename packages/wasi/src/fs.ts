/*
Create a union filesystem as described by a FileSystemSpec[].

This code should not depend on anything that must run in node.js.
*/

import unzip from "fflate-unzip";
import { Volume, createFsFromVolume, fs as memfs, DirectoryJSON } from "memfs";
import { Union } from "unionfs";
import type * as FileSystem from "fs";
import type { WASIBindings } from "./types";

export type { FileSystem };

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

interface ZipFs {
  type: "zip";
  data: Buffer;
  mountpoint: string;
}

interface MemFs {
  type: "mem";
  contents?: DirectoryJSON;
}

export type FileSystemSpec = NativeFs | ZipFs | ZipFsFile | MemFs | DevFs;

export async function createFileSystem(
  specs: FileSystemSpec[],
  bindings: WASIBindings
): Promise<FileSystem> {
  const ufs = new Union();
  (ufs as any).constants = memfs.constants;
  if (specs.length == 0) {
    return memFs() as any; // empty memfs
  }
  if (specs.length == 1) {
    // don't use unionfs:
    return await specToFs(specs[0], bindings);
  }
  for (const spec of specs) {
    const fs: any = await specToFs(spec, bindings);
    if (fs != null) {
      // e.g., native bindings may be null.
      ufs.use(fs);
    }
  }
  return ufs as any;
}

async function specToFs(
  spec: FileSystemSpec,
  bindings: WASIBindings
): Promise<FileSystem> {
  // All these "as any" are because really nothing quite implements FileSystem yet!
  // See https://github.com/streamich/memfs/issues/735
  if (spec.type == "zip") {
    return zipFs(spec.data, spec.mountpoint) as any;
  } else if (spec.type == "zipfile") {
    throw Error(`you must convert zipfile -- read ${spec.zipfile} into memory`);
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

async function zipFs(data: Buffer, directory: string = "/") {
  const fs = createFsFromVolume(new Volume()) as any;
  await unzip(data, { to: { fs, directory } });
  return fs;
}

function memFs(contents?: DirectoryJSON) {
  const vol = contents != null ? Volume.fromJSON(contents) : new Volume();
  return createFsFromVolume(vol);
}
