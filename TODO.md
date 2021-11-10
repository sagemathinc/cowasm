# Todo

## Build

[ ] Remove MPIR as a dependency, since it has to be possible. See https://trac.sagemath.org/ticket/32549#comment:44Weird bug:

## MacOS

I can't run the zig tests (and some build stuff is confused/broken) because
you can't set DYLD_LIBRARY_PATH in make and have it get inherited, often. See https://stackoverflow.com/questions/63629878/dyld-library-path-environment-variable-is-not-forwarded-to-external-command-in-m

This is a security constraint that seriously complicates things...

NOTE: manually setting DYLD_LIBRARY_PATH then running the zig tests directly works. I just can't run them via the makefile.  Probably the solution is to write a little node.js or python program to run the tests and have that set DYLD_LIBRARY_PATH...?

## Bugs

Something wrong with powers when exponent is an Integer:

```py
jsage: a = ZZ(2)^ZZ(900)
1
jsage: a = ZZ(2)^900
8452712498170643941637436558664265704301557216577944354047371344426782440907597751590676094202515006314790319892114058862117560952042968596008623655407033230534186943984081346699704282822823056848387726531379014466368452684024987821414350380272583623832617294363807973376
```
