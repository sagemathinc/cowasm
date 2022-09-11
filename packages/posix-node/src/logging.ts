/*
Initialize debug logging.

We use the standard debug logger with name "posix-node": https://www.npmjs.com/package/debug

DEBUG_FILE option:

To log to a file instead *also* set the env variable DEBUG_FILE to that
filename. You need to log to a file in case you're debugging something that
forks and doesn't have stdout/stderr anymore.  Also, we do NOT reset the
contents of the file and instead always append, because forking would be a
problem, where the forked process might delete the file in the middle of the
run.
*/

import debug from "debug";
import { format } from "util";
import { appendFileSync } from "fs";

if (process.env.DEBUG_FILE) {
  const debugFilename = process.env.DEBUG_FILE;
  debug.log = (...args) => {
    const s = format(...args);
    appendFileSync(debugFilename, s + "\n");
  };
}

export const log = debug("posix-node");
