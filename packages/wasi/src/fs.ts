import unzip from "fflate-unzip";
import { fs } from "memfs";
//import { ufs } from "unionfs";
import { readFile } from "fs/promises";

// path = location of a .zip file in the filesystem
// to = location in the filesystem
// Returns a memfs that makes the contents of the zipFilename
// available at to in a virtual memfs filesystem.
export async function zipfs(path: string, directory: string = "/") {
  const data = await readFile(path);
  //const fs = new Volume() as any;
  await unzip(data, { to: { fs:fs as any, directory } });
  return fs;
}
