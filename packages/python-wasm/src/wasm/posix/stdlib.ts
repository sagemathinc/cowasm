import { notImplemented } from "./util";

export default function stdlib({ child_process, os, recv, send, fs }) {
  return {
    // void longjmp(jmp_buf env, int val);
    longjmp() {
      notImplemented("longjmp");
    },

    // int getloadavg(double loadavg[], int nelem);
    getloadavg: (loadavgDoubleArrayPtr: number, nelem: number): number => {
      const { loadavg } = os;
      if (loadavg == null) {
        // load average is not attainable
        return -1;
      }
      const avg = loadavg();
      send.f64(loadavgDoubleArrayPtr, avg[0]);
      send.f64(loadavgDoubleArrayPtr + 8, avg[1]); // double = 8 bytes in WASM
      send.f64(loadavgDoubleArrayPtr + 16, avg[2]);

      // number of samples (not provided by loadavg).  In python itself if you don't get
      // all of them (3 are requested), it just gives an error.
      return nelem;
    },

    // int system(const char *command);
    // This below is not exactly like system because it runs until the command completes with no visible output
    // until it completes.
    // TODO: this only works once then gets totally broken when using webworkers!  It works fine
    // for the blocking version only.
    system: (commandPtr): number => {
      if (child_process.spawnSync == null) {
        notImplemented("system is not implemented yet");
      }
      const command = recv.string(commandPtr);
      const { stdout, stderr, status } = child_process.spawnSync(command, {
        shell: true,
      });
      console.log(stdout.toString());
      console.warn(stderr.toString());
      return status;
    },

    // char *realpath(const char *path, char *resolved_path);
    realpath: (pathPtr, resolvedPathPtr): number => {
      try {
        const path = recv.string(pathPtr);
        const resolvedPath = fs.realpathSync(path);
        return send.string(resolvedPath, { ptr: resolvedPathPtr });
      } catch (err) {
        console.warn("ERROR", err);
        // return 0 to indicate error, NOT -1!
        return 0;
      }
    },

    /*
    We need mkstemp since it used in editline/readline.c to do history file truncation.
    (Python doesn't use this since it has its own implementation.)
    */
    // Commented out since we have a C implementation in stdlib.c; the one below should work fine though...?
    /*
    mkstemp: (templatePtr: number): number => {
      let template = recv.string(templatePtr);
      // template ends in XXXXXX
      if (template.slice(-6) != "XXXXXX") {
        throw Error("template must end in XXXXXX");
      }
      // the algorithm in musl is to try 100 randomizations of the last 6 characters
      let retries = 100;
      while (retries > 0) {
        // See https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        template =
          template.slice(0, -6) +
          (Math.random().toString(36) + "00000000000000000").slice(2, 8);
        try {
          return fs.openSync(
            template,
            fs.constants?.O_RDWR | fs.constants?.O_CREAT | fs.constants?.O_EXCL,
            0o600
          );
        } catch (err) {
          retries -= 1;
          if (retries == 0) {
            console.warn(err);
          }
        }
      }
      // failed
      return -1;
    },
    */
  };
}
