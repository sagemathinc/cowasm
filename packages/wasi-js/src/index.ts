import WASI from "./wasi";
export default WASI;
export type { WASIBindings, WASIConfig, WASIFileSystem } from "./types";
export type { FileSystemSpec } from "./fs";
export { createFileSystem } from "./fs";
