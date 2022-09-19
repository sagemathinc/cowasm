import WASI from "./wasi";
export default WASI;
export type { WASIBindings, WASIConfig, WASIFileSystem } from "./types";
export type { FileSystemSpec } from "./fs";
export { createFileSystem } from "./fs";
import * as constants from "./constants";
export { constants };
