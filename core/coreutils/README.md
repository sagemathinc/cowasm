# Some of FreeBSD Ported to WebAssembly

For use in https://cowasm.org.

- This includes many of the coreutils in the utils directory. We aren't porting everything, e.g., `chroot` doesn't make a lot of sense in the context of WebAssembly/WASI.

## Known broken things

- [ ] `tail -f` doesn't work because epoll isn't implemented in cowasm yet. See posix/epoll.ts elsewhere.

- [ ] `split` doesn't work due to freopen and other issues I haven't looked into yet.

- [ ] `expand foo` doesn't work when input is a file instead of stdin. This is because the implementation uses `freopen` to make the file into stdin, which is a pretty neat trick.  The fix isn't to rewrite expand, but instead to fix `freopen`. This is extra challenging because our code for running processes then restoring state has to deal with this properly, and probably doesn't now (?).  There's also a test of freopen for wasi [here](https://github.com/nodejs/node/blob/main/test/wasi/c/freopen.c) that might be inspiring.
  - Similarly, `fold` is broken for exactly the same reason
  - Also `nl` is broken.

### TODO

- [ ] the `env` coreutil calls execvp.  We should make it work with WASM targets as well.  That might just mean changing execvp though, since there is no fork \-\- it's just exec, which is maybe easier.

## Sources

- https://github.com/freebsd/freebsd-src
- https://github.com/coreutils/coreutils
- https://github.com/DiegoMagdaleno/BSDCoreUtils

