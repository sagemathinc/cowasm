export { run } from "./runtime";
import WASI, { WASIConfig } from "./wasi";
export type { WASIConfig };
export default WASI;
export type { FileSystemSpec, FileSystem } from "./fs";
export { createFileSystem } from "./fs";
