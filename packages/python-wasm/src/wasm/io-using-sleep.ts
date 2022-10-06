/*
Synchronous blocking IO using sleep!
*/

import type { IOProvider } from "./types";
import { SIGINT } from "./constants";
import debug from "debug";

const log = debug("wasm:io-provider-using-sleep");

export default class IOProviderUsingSleep implements IOProvider {
  private worker;

  constructor(worker) {
    log("IOProviderUsingSleep");
    this.worker = worker;
  }

  getExtraOptions() {
    return {};
  }

  private async send(
    target: "write-signal" | "write-stdin",
    body: object
  ): Promise<void> {
    this.worker.postMessage({
      event: target,
      body,
    });
  }

  signal(sig: number = SIGINT): void {
    log("signal", sig);
    this.send("write-signal", { sig });
  }

  writeToStdin(data: Buffer): void {
    log("writeToStdin", data);
    this.send("write-stdin", { data: data.toString() });
  }
}

