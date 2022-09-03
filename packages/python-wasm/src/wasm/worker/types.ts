export interface IOHandler {
  sleep: (milliseconds: number) => void;
  getStdin: () => Buffer;
  wasmEnv: object;
}
