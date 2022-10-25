# Some of FreeBSD Ported to WebAssembly

For use in https://cowasm.org.

- This includes many of the coreutils in the utils directory. We aren't porting everything, e.g., `chroot` doesn't make a lot of sense in the context of WebAssembly/WASI.

## Known broken things

- [ ] `tail -f` doesn't work because epoll isn't implemented in cowasm yet. See posix/epoll.ts elsewhere.

### TODO

- [ ] the `env` coreutil command calls execvp.  We should make it work with WASM targets as well.  That might just mean changing execvp though, since there is no fork \-\- it's just exec, which is maybe easier.

## Sources

- https://github.com/freebsd/freebsd-src
- https://github.com/coreutils/coreutils
- https://github.com/DiegoMagdaleno/BSDCoreUtils

