import debug0 from "debug";
import { join } from "path";
import { mkdirSync, appendFileSync /*createWriteStream */ } from "fs";
import { format } from "util";

const cache: { [name: string]: any } = {};

const LOGPATH = "/tmp/python-wasm";

export default function debug(name: string) {
  if (cache[name] != null) {
    return cache[name];
  }
  const logger = debug0(name);
  const path = join(LOGPATH, `${name}.log`);
  mkdirSync(LOGPATH, { recursive: true });

  // A nice async approach is this, which we use in CoCalc:
  // create the file stream; using a stream ensures
  // that everything is written in the right order with
  // no corruption/collision between different logging.
  //   const stream = createWriteStream(path);
  //   logger.log = (...args) => {
  //     stream.write(myFormat(...args) + '\n');
  //   };
  // However, we can't do the above, since webassembly can block actually writing
  // out to the stream, and sync writing to a stream is deprecated from node. So
  // we have to do a sync append as below:
  logger.log = (...args) => {
    appendFileSync(path, myFormat(...args) + "\n");
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
