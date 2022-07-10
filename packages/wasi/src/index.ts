import WASI from "./wasi";
export default WASI;
export type { WASIConfig } from "./types";
export type { FileSystemSpec, FileSystem } from "./fs";
export { createFileSystem } from "./fs";
export { run } from "./runtime";