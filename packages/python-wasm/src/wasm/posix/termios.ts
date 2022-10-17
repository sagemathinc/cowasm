export default function stdio({ posix }) {
  return {
    // export fn tcsetattr(fd: std.c.fd_t, act: c_int, tio: *termios.termios) c_int {
    tcsetattr(): number {
      // NOTE/TODO: Horrendous hack!
      // For most application, if they are calling tcsetattr, it's because they want to
      // set the terminal to a mode suitable for editline/curses.  So we just always do
      // that, instead of properly parsing the input.  This is obviously a TODO, and
      // will lead to trouble.
      // For example, run dash-wasm, then try to run lua directly and echo mode is still off...
      posix.enableRawInput?.();
      posix.disableEcho?.();
      return 0;
    },
  };
}
