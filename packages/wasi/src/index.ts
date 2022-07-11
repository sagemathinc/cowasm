import WASI from "./wasi";
export default WASI;
export type { WASIBindings, WASIConfig } from "./types";
export type { FileSystemSpec, FileSystem } from "./fs";
export { createFileSystem } from "./fs";
