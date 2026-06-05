import { PythonExec } from "./project-files";

export interface PythonKernelIO {
  on(event: "stdout" | "stderr", listener: (data: any) => void): void;
  removeListener(event: "stdout" | "stderr", listener: (data: any) => void): void;
  signal(sig?: number): void;
  flushOutput?(timeoutMs?: number): Promise<void>;
}

export interface PythonCommandLimits {
  maxRuntimeMs?: number;
  maxOutputBytes?: number;
}

export interface PythonCommandResult {
  stdout: string;
  stderr: string;
  durationMs: number;
}

const DEFAULT_LIMITS: Required<PythonCommandLimits> = {
  maxRuntimeMs: 30_000,
  maxOutputBytes: 1024 * 1024,
};

export class PythonCommandRunner {
  private exec: PythonExec;
  private kernel: PythonKernelIO;
  private limits: Required<PythonCommandLimits>;

  constructor({
    exec,
    kernel,
    limits = {},
  }: {
    exec: PythonExec;
    kernel: PythonKernelIO;
    limits?: PythonCommandLimits;
  }) {
    this.exec = exec;
    this.kernel = kernel;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  async run(code: string): Promise<PythonCommandResult> {
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    const start = Date.now();

    const addOutput = (stream: "stdout" | "stderr", data: any) => {
      const text = decodeOutput(data);
      outputBytes += byteLength(data, text);
      if (stream == "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
      if (!outputExceeded && outputBytes > this.limits.maxOutputBytes) {
        outputExceeded = true;
        this.kernel.signal(2);
      }
    };

    const onStdout = (data) => addOutput("stdout", data);
    const onStderr = (data) => addOutput("stderr", data);
    this.kernel.on("stdout", onStdout);
    this.kernel.on("stderr", onStderr);

    const timeout = setTimeout(() => {
      timedOut = true;
      this.kernel.signal(2);
    }, this.limits.maxRuntimeMs);

    try {
      await this.exec(code);
      await this.kernel.flushOutput?.(500);
    } catch (err) {
      if (timedOut) {
        throw Error(`python command timed out after ${this.limits.maxRuntimeMs}ms`);
      }
      if (outputExceeded) {
        throw Error(
          `python command output exceeded ${this.limits.maxOutputBytes} bytes`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      this.kernel.removeListener("stdout", onStdout);
      this.kernel.removeListener("stderr", onStderr);
    }

    if (timedOut) {
      throw Error(`python command timed out after ${this.limits.maxRuntimeMs}ms`);
    }
    if (outputExceeded) {
      throw Error(
        `python command output exceeded ${this.limits.maxOutputBytes} bytes`
      );
    }
    return { stdout, stderr, durationMs: Date.now() - start };
  }
}

function decodeOutput(data: any): string {
  if (typeof data == "string") return data;
  return new TextDecoder().decode(data);
}

function byteLength(data: any, text: string): number {
  if (typeof data == "string") {
    return new TextEncoder().encode(data).length;
  }
  if (data?.byteLength != null) {
    return data.byteLength;
  }
  return new TextEncoder().encode(text).length;
}
