export interface IOHandlerClass {
  sleep: (milliseconds: number) => void;
  getStdin: (milliseconds?: number) => Buffer;
  getSignalState: () => number;
}
