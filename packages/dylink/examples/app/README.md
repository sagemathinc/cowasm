This example illustrates two WebAssembly modules with static data defined both in c code and in a shared header file, and also use of function pointes.  There's also some data defined as a pointer to a struct, which is the sort of subtle thing that comes up in loading Python extension modules.

This is a self\-contained example that doesn't use the dylink library, and implements by hand the key subtle foundations of position independent code that are foundational for implementing the dlopen and dlsym commands.

