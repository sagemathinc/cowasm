export default function stdlib({ child_process, recv }) {
  return {
    // int system(const char *command);
    // This below is not exactly like system because it runs until the command completes with no visible output
    // until it completes.
    // TODO: this only works once then gets totally broken when using webworkers!  It works fine
    // for the blocking version only.
    system: (commandPtr): number => {
      if (child_process.spawnSync == null) {
        throw Error("system is not implemented yet");
      }
      const command = recv.string(commandPtr);
      const { stdout, stderr, status } = child_process.spawnSync(command, {
        shell: true,
      });
      console.log(stdout.toString());
      console.warn(stderr.toString());
      return status;
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
