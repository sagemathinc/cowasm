export default function stdio(context) {
  const { fs, send } = context;
  return {
    /* char *tmpnam(char *s);

    Linux manpage is funny and clear:

The tmpnam() function returns a pointer to a string that is a valid filename,
and such that a file with this name did not exist at some point in time, so that
naive programmers may think it a suitable name for a temporary file. If the
argument s is NULL, this name is generated in an internal static buffer and may
be overwritten by the next call to tmpnam().   If s is not NULL, the name is copied to
the character array (of length at least L_tmpnam) pointed to by s and the value s
is returned in case of success.
    */

    tmpnam(sPtr: number): number {
      let s = "/tmp/tmpnam_";
      for (let i = 0; i < 1000; i++) {
        let name = s;
        // very naive, but WASM is a single user VM so a lot of security issues disappear
        for (let j = 0; j < 6; j++) {
          name += String.fromCharCode(65 + Math.floor(26 * Math.random()));
        }
        if (!fs.existsSync(name)) {
          if (sPtr) {
            send.string(name, { ptr: sPtr, len: 20 });
            return sPtr;
          } else {
            if (!context.state.tmpnam_buf) {
              context.state.tmpnam_buf = send.malloc(20);
            }
            send.string(name, { ptr: context.state.tmpnam_buf, len: 20 });
            return context.state.tmpnam_buf;
          }
        }
      }
      return 0; // error
    },

    /*
    Stubs for popen and pclose that throw an error. I think these would be kind of impossible
    to do in WASM (without multiple threads... hence sync'd filesystem) because they are
    nonblocking...?

    FILE* popen(const char* command, const char* type);
    int pclose(FILE* stream);
    */
    popen(_commandPtr: number, _typePtr: number): number {
      // returning 0 means it couldn't do it.
      return 0;
    },

    pclose(_streamPtr: number): number {
      return -1;
    },
  };
}
