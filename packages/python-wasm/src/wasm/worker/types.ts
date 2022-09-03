export interface IOHandlerClass {
  sleep: (milliseconds: number) => void;
  getStdin: () => Buffer;
  getSignalState: () => number;
}
