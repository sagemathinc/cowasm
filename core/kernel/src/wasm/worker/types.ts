export enum Stream {
  STDOUT = 1,
  STDERR = 2,
}

export interface IOHandlerClass {
  sleep: (milliseconds: number) => void;
  getStdin: (milliseconds?: number) => Buffer;
  getSignalState: () => number;
  sendOutput(stream: Stream, data: Buffer): void;
}
