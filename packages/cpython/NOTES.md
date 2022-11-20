# Notes

## pylifecycle.c

I just noticed that in `Python/pylifecycle.c` the function is\_valid\_fd uses `fcntl(fd, F_GETFD)` to tell if a fd is valid in case of \_\_wasm\_\_.  I then read the source code of `fcntl` in wasi... and it is **FAKE** \-\- it always succeeds for any random input of fd! 

I'm not sure if I patch pylifecycle.c or not, since this code is only used in one spot to signal a fatal error, which happens later anyways.  It's just a little weird/worrisome.
