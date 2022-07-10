import unzip from "fflate-unzip";
import { Volume, createFsFromVolume } from "memfs";
import { ufs } from "unionfs";
import { readFile } from "fs/promises";

// path = location of a .zip file in the filesystem
// to = location in the filesystem
// Returns a memfs that makes the contents of the zipFilename
// available at to in a virtual memfs filesystem.
export async function zipfs(path: string, directory: string = "/") {
  const zip = await createZipfs(path, directory);
  (ufs as any).constants = zip.constants;
  ufs.use(zip as any);
  ufs.use(devices() as any);   // last one checked
  return ufs;
}

// this is generic and would work in a browser:
function devices() {
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

async function createZipfs(path: string, directory: string = "/") {
  const fs = createFsFromVolume(new Volume()) as any;
  const data = await readFile(path);
  await unzip(data, { to: { fs, directory } });
  return fs;
}
