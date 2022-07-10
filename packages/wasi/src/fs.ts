/*
Create a union filesystem as described by a FileSystemSpec[].
*/

import unzip from "fflate-unzip";
import { Volume, createFsFromVolume, fs as memfs, DirectoryJSON } from "memfs";
import { Union } from "unionfs";
import { readFile } from "fs/promises";
import * as nativeFs from "fs";

// The native filesystem
interface NativeFs {
  type: "native";
}

interface DevFs {
  type: "dev";
}

interface ZipFs {
  type: "zip";
  zipfile: string;
  mountpoint: string;
}

interface MemFs {
  type: "mem";
  contents?: DirectoryJSON;
}

export type FileSystemSpec = NativeFs | ZipFs | MemFs | DevFs;
export type Filesystem = typeof nativeFs;

async function specToFs(spec: FileSystemSpec): Promise<Filesystem> {
  if (spec.type == "zip") {
    return (await zipFs(spec.zipfile, spec.mountpoint)) as any;
  } else if (spec.type == "native") {
    return nativeFs;
  } else if (spec.type == "mem") {
    return memFs(spec.contents) as any;
  } else if (spec.type == "dev") {
    return devFs() as any;
  }
  throw Error(`unknown spec type - ${JSON.stringify(spec)}`);
}

export async function createFileSystem(
  specs: FileSystemSpec[]
): Promise<Filesystem> {
  const ufs = new Union();
  (ufs as any).constants = memfs.constants;
  if (specs.length == 0) {
    return memFs() as any; // empty memfs
  }
  if (specs.length == 1) {
    // don't use unionfs:
    return await specToFs(specs[0]);
  }
  for (const spec of specs) {
    ufs.use(await specToFs(spec));
  }
  return ufs as any;
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

async function zipFs(path: string, directory: string = "/") {
  const fs = createFsFromVolume(new Volume()) as any;
  const data = await readFile(path);
  await unzip(data, { to: { fs, directory } });
  return fs;
}

function memFs(contents?: DirectoryJSON) {
  const vol = contents != null ? Volume.fromJSON(contents) : new Volume();
  return createFsFromVolume(vol);
}
