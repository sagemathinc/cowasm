# Sqlite3-Wasm

The main problem right now is that sqlite3\-wasm only works with an in memory database.  So this breaks:

```sh
$ sqlite3  a.sql   # the native sqlite3
create table foo(bar integer);
```

Now try to open it in sqlite3\-wasm \-\- BOOM!

```sh
$ DEBUG=* sqlite3-wasm a.sql
...
wasi fd_pread [ 4, 1048536, 1, 200n, 1048532 ] +0ms
  wasi getiovs: warning -- truncating buffer to fit in memory +0ms
  wasi result =  0 +0ms
  wasi fd_pread [ 4, 1048536, 1, 8192n, 1048532 ] +0ms
  wasi getiovs: warning -- truncating buffer to fit in memory +0ms
  wasi result =  0 +0ms
/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/cowasm/packages/sqlite/bin/../../../bin/cowasm: line 8: 91325 Bus error: 10           node "$SCRIPTPATH"/../dist/cowasm/node-terminal-debug.js "$@"
```

This "truncating buffer to fit in memory" suggests maybe mmap is involved. That said, I've disabled mmap and it doesn't help, so I don't yet know what the problem is.
