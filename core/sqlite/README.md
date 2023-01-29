# @cowasm/sqlite: WebAssembly build of sqlite

## Status

This is used as a library dependency when building cpython's sqlite3 module and that all
works fine, except for the big problem mentioned below.

## Big problem: files don't work

The main problem right now is that sqlite3\-wasm only works with an in memory database.  So this breaks:

```sh
$ sqlite3  a.sql   # the native sqlite3
create table foo(bar integer);
```

Now try to open it in sqlite3\-wasm \-\- BOOM!

```sh
$ cowasm dist/wasm/bin/sqlite3 a.sql
SQLite version 3.39.4 2022-09-29 15:55:41
Enter ".help" for usage hints.
sqlite> create table foo(title);
Parse error: disk I/O error (10)
sqlite> ^D
```

I think issues with mmap are involved. That said, I've disabled mmap and it doesn't help, so I don't yet know what the problem is.  Maybe some other stub function returns invalid data that messes something up.

## References

There's interesting discussion and links here https://news.ycombinator.com/item?id=33374402 

