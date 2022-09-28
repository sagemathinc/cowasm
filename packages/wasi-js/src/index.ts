import WASI from "./wasi.js";
export default WASI;
export type { WASIBindings, WASIConfig, WASIFileSystem } from "./types.js";
export type { FileSystemSpec } from "./fs.js";
export { createFileSystem } from "./fs.js";
import * as constants from "./constants.js";
export { constants };
