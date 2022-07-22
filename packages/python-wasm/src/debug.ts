import debug0 from "debug";
import { join } from "path";
import { mkdirSync, createWriteStream } from "fs";
import { format } from "util";

const cache: { [name: string]: any } = {};

const LOGPATH = "/tmp/python-wasm";

export default function debug(name: string) {
  if (cache[name] != null) {
    return cache[name];
  }
  const logger = debug0(name);
  // create the file stream; using a stream ensures
  // that everything is written in the right order with
  // no corruption/collision between different logging.
  const path = join(LOGPATH, `${name}.log`);
  mkdirSync(LOGPATH, { recursive: true });
  const stream = createWriteStream(path);
  logger.log = (...args) => {
    stream.write(myFormat(...args) + '\n');
  };
  cache[name] = logger;
  return logger;
}

function myFormat(...args): string {
  if (args.length > 1 && typeof args[0] == "string" && !args[0].includes("%")) {
    // This is something where we didn't use printf formatting.
    const v: string[] = [];
    for (const x of args) {
      try {
        v.push(typeof x == "object" ? JSON.stringify(x) : `${x}`);
      } catch (_) {
        // better to not crash everything just for logging
        v.push(`${x}`);
      }
    }
    return v.join(" ");
  }
  // use printf formatting.
  return format(...args);
}
