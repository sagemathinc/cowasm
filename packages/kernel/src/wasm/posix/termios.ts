/*

RANDOM NOTES

MAJOR TODO:  For xterm.js entirely in browser (and MS Windows), we may still
have to implement this stuff.  Hopefully this will be much easier, since we
implemented everything via our posix-node and can observe what's expected
by programs.

Also, for example, one of the flags is

    "ISIG   When any of the characters INTR, QUIT, SUSP, or DSUSP are received, generate the corresponding signal."

and since we are implementing signals and watching characters, of course this is some
logic that we would do.

On a POSIX server, a complete and easy option is to directly call the c library via
an extension module, translating flags back and forth between native and wasi,
and we do exactly that here.

Right now on non-POSIX, the following are partially stub functions, but not minimal.

IMPORTANT! We can't do NOTHING!  For example, libedit will
randomly not work if we do nothing (which drove me crazy for days)!
This is because of the line

   	if (tcgetattr(fileno(rl_instream), &t) != -1 && (t.c_lflag & ECHO) == 0)

in packages/libedit/build/wasm/src/readline.c.   If t.c_lflag doesn't have the ECHO
flag, then libedit will be totally broken for interactive use.
We set at least that below for fd=0 and intend to do more (TODO!).

           tcflag_t c_iflag;      // input modes
           tcflag_t c_oflag;      // output modes
           tcflag_t c_cflag;      // control modes
           tcflag_t c_lflag;      // local modes
           cc_t     c_cc[NCCS];   /; special characters

I think for us c_lflag is mostly what matters.

Another key point that is subtle, is we can't just worry about a subset of "official
posix flags" and forget about the rest.  We have to see what was changed at the
wasi level, then modify exactly what is true natively to match that.   This makes
the code below a bit odd.
*/

import debug from "debug";
import constants from "./constants";

const log = debug("posix:termios");

const FLAGS = {
  c_iflag: [
    "IGNBRK",
    "BRKINT",
    "IGNPAR",
    "PARMRK",
    "INPCK",
    "ISTRIP",
    "INLCR",
    "IGNCR",
    "ICRNL",
    "IXON",
    "IXANY",
    "IXOFF",
    "IMAXBEL",
    "IUTF8",
  ],
  c_oflag: ["OPOST", "ONLCR", "OCRNL", "ONOCR", "ONLRET", "OFILL", "OFDEL"],
  c_cflag: [
    "CSIZE",
    "CS5",
    "CS6",
    "CS7",
    "CS8",
    "CSTOPB",
    "CREAD",
    "PARENB",
    "PARODD",
    "HUPCL",
    "CLOCAL",
  ],
  c_lflag: [
    "ISIG",
    "ICANON",
    "ECHO",
    "ECHOE",
    "ECHOK",
    "ECHONL",
    "NOFLSH",
    "TOSTOP",
    "IEXTEN",
  ],
} as const;

interface Termios {
  c_iflag: number;
  c_oflag: number;
  c_cflag: number;
  c_lflag: number;
}

export default function termios({ posix, recv, send, wasi, noStdio }) {
  function termios_set(tioPtr: number, { c_iflag, c_oflag, c_cflag, c_lflag }) {
    const size = 4;
    send.u32(tioPtr, c_iflag ?? 0);
    send.u32(tioPtr + size, c_oflag ?? 0);
    send.u32(tioPtr + 2 * size, c_cflag ?? 0);
    send.u32(tioPtr + 3 * size, c_lflag ?? 0);
  }

  function termios_get(tioPtr: number): {
    c_iflag: number;
    c_oflag: number;
    c_cflag: number;
    c_lflag: number;
  } {
    const size = 4;
    return {
      c_iflag: recv.u32(tioPtr),
      c_oflag: recv.u32(tioPtr + size),
      c_cflag: recv.u32(tioPtr + 2 * size),
      c_lflag: recv.u32(tioPtr + 3 * size),
    };
  }

  function native_to_wasi(tio_native: Termios): Termios {
    // now translate the flags from native to WASI
    const tio_wasi: Termios = {
      c_iflag: 0,
      c_oflag: 0,
      c_cflag: 0,
      c_lflag: 0,
    };
    let s: string[] = [];
    for (const key in tio_native) {
      tio_wasi[key] = 0;
      for (const name of FLAGS[key]) {
        if (tio_native[key] & posix.constants[name]) {
          tio_wasi[key] |= constants[name];
          if (log.enabled) {
            s.push(name);
          }
        }
      }
    }
    if (log.enabled) {
      s.sort();
      log("NATIVE: ", s.join(" "));
    }
    return tio_wasi;
  }

  /*
  // this doesn't end up getting used, so commented out.
  function wasi_to_native(tio_wasi: Termios): Termios {
    const tio_native: Termios = {
      c_iflag: 0,
      c_oflag: 0,
      c_cflag: 0,
      c_lflag: 0,
    };
    // let s: string[] = [];
    for (const key in FLAGS) {
      tio_native[key] = 0;
      for (const name of FLAGS[key]) {
        if (tio_wasi[key] & constants[name]) {
          tio_native[key] |= posix.constants[name];
          // s.push(name);
        }
      }
    }
    // s.sort();
    //console.log(s.join(" "));
    //require("fs").appendFileSync("/tmp/log", s + "\n");

    return tio_native;
  }
  */

  return {
    /*
    These two functions are critical to applications that use
    the terminal.  They do a huge amount in a traditional POSIX system,
    e.g., setting baud rates, ICANON mode, echo, etc.

    I think xterm.js is orthogonal to this; it just reflects how the
    underlying terminal behaves.

     int
     tcgetattr(int fildes, struct termios *termios_p);

     int
     tcsetattr(int fildes, int optional_actions,
         const struct termios *termios_p);

    */
    tcgetattr(wasi_fd: number, tioPtr: number): number {
      const fd = wasi.FD_MAP.get(wasi_fd).real;
      let tio_wasi: Termios;
      let tio_native: Termios;
      if (!noStdio && posix.tcgetattr != null) {
        tio_native = posix.tcgetattr(fd);
        // now translate the flags from native to WASI
        tio_wasi = native_to_wasi(tio_native);
      } else {
        tio_native = {} as any; // just for logging below
        if (fd == 0 || fd == 1) {
          // I copied this from running it and observing.
          // NO MATTER what we must c_lflag: constants.ECHO as below, though maybe
          // having everything is better.
          tio_wasi = {
            c_iflag: 27906,
            c_oflag: 5,
            c_cflag: 1200,
            c_lflag: 32827,
          };
          //           // stdin - do something to avoid total disaster (see comment in header)
          //           tio_wasi = {
          //             c_iflag: 0,
          //             c_oflag: 0,
          //             c_cflag: 0,
          //             c_lflag: constants.ECHO, // at least this is needed or nothing will work.
          //           };
        } else {
          tio_wasi = {
            c_iflag: 0,
            c_oflag: 0,
            c_cflag: 0,
            c_lflag: 0,
          };
        }
      }
      //console.log("tcgetattr", { wasi_fd, fd, tio_wasi, tio_native });
      //console.log("GET");
      //wasi_to_native(tio_wasi);
      termios_set(tioPtr, tio_wasi);
      return 0;
    },

    tcsetattr(
      wasi_fd: number,
      _optional_actions: number, // ignored (involves buffering and when change happens)
      tioPtr: number
    ): number {
      const fd = wasi.FD_MAP.get(wasi_fd).real;
      const tio_wasi = termios_get(tioPtr);
      if (noStdio || posix.tcsetattr == null || posix.tcgetattr == null) {
        return 0;
      }
      const tio_native = posix.tcgetattr(fd);
      const tio_native_orig = { ...tio_native };
      const tio_wasi_current = native_to_wasi(tio_native);

      // We change in native **exactly** what they changed, leaving everything
      // else the same.
      let somethingChanged = false;
      for (const key in FLAGS) {
        for (const name of FLAGS[key]) {
          if (
            (tio_wasi[key] & constants[name]) !=
            (tio_wasi_current[key] & constants[name])
          ) {
            // name was changed
            somethingChanged = true;
            if (tio_wasi[key] & constants[name]) {
              // set it
              tio_native[key] |= posix.constants[name];
            } else {
              // unset it
              tio_native[key] &= ~posix.constants[name];
            }
          }
        }
      }
      if (!somethingChanged) {
        log("tcsetattr: nothing changed");
        return 0;
      }
      log("tcsetattr", { fd, tio_native, tio_native_orig });
      posix.tcsetattr(fd, posix.constants.TCSANOW, tio_native);
      return 0;
    },

    // These are stubs for now:

    // int tcdrain(int fildes);
    tcdrain(): number {
      log("tcdrain - STUB");
      return 0;
    },
    // int tcflow(int fildes, int action);
    tcflow(): number {
      log("tcflow - STUB");
      return 0;
    },
    // int tcflush(int fildes, int action);
    tcflush(): number {
      log("tcflush - STUB");
      return 0;
    },
    // int tcsendbreak(int fildes, int duration);
    tcsendbreak(): number {
      log("tcsendbreak - STUB");
      return 0;
    },
  };
}
