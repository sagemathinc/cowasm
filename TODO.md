# Todo

## MacOS

I can't run the zig tests (and some build stuff is confused/broken) because
you can't set DYLD_LIBRARY_PATH in make and have it get inherited, often. See https://stackoverflow.com/questions/63629878/dyld-library-path-environment-variable-is-not-forwarded-to-external-command-in-m

This is a security constraint that seriously complicates things...

NOTE: manually setting DYLD_LIBRARY_PATH then running the zig tests directly works. I just can't run them via the makefile.  Probably the solution is to write a little node.js or python program to run the tests and have that set DYLD_LIBRARY_PATH...?
