# dash-wasm -- WebAssembly dash shell for servers and browsers (pre-alpha version

This provides the dash shell compiled to WebAssembly, suitable for use in a
nodejs program or in a web browser.  Try this in your browser right now:

LIVE DEMO:  https://cowasm.sh 

Here is a little demo below, illustrating that **Lua, sqlite, tar, and Python 3.11 \(with numpy!\)** are all
included, among other things. Do NOT get your hopes up and expect this to work well, since _**there are many remaining issues!**_

See https://github.com/sagemathinc/cowasm if you're interested in this project, and
in particular [the dash package](https://github.com/sagemathinc/cowasm/tree/main/packages/dash).

```sh
~ $ npx dash-wasm@latest
(CoWasm) sh$ echo $PATH
/cowasm/usr/bin
(CoWasm) sh$ python      
Python 3.11.0 (main, Nov  2 2022, 12:26:39) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 85033a9aa569b41658404d0e on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> import numpy
>>> numpy.random.rand(2,2)
array([[0.61989363, 0.33999592],
       [0.86028145, 0.78855092]])
>>> ^D
(CoWasm) sh$ ls $PATH
basename cut      false    join     mktemp   realpath stat     tty      yes
bzip2    date     find     less     mv       rm       tail     uname
cat      dirname  fmt      ln       nl       rmdir    tar      unexpand
chmod    du       fold     logname  paste    seq      tee      uniq
clear    env      grep     ls       pathchk  sh       test     viz
comm     expand   hanoi    lua      pr       sleep    touch    wc
cp       expr     head     man      python   sort     tr       which
csplit   factor   id       mkdir    readlink sqlite3  tsort    xargs
(CoWasm) sh$ lua
Lua 5.4.4  Copyright (C) 1994-2022 Lua.org, PUC-Rio
> 2 + 3
5
> ^D
(CoWasm) sh$ sqlite3
SQLite version 3.39.4 2022-09-29 15:55:41
Enter ".help" for usage hints.
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.
sqlite> select 2+3;
5
sqlite> ^D
(CoWasm) sh$ echo $((2+3))
5
(CoWasm) sh$ stat $PATH/tar
0 62 ---------- 1 (0) (0) 0 743701 "Oct 29 17:19:15 2022" "Oct 29 17:19:15 2022" "Oct 29 17:19:15 2022" 0 0 /cowasm/bin/tar
(CoWasm) sh$ tar --help
tar(bsdtar): manipulate archive files
First option must be a mode specifier:
  -c Create  -r Add/Replace  -t List  -u Update  -x Extract
Common Options:
  -b #  Use # 512-byte records per I/O block
  -f <filename>  Location of archive (default /dev/tape)
  -v    Verbose
  -w    Interactive
Create: tar -c [options] [<file> | <dir> | @<archive> | -C <dir> ]
  <file>, <dir>  add these items to archive
  -z, -j, -J, --lzma  Compress archive with gzip/bzip2/xz/lzma
  --format {ustar|pax|cpio|shar}  Select archive format
  --exclude <pattern>  Skip files that match pattern
  -C <dir>  Change to <dir> before processing remaining files
  @<archive>  Add entries from <archive> to output
List: tar -t [options] [<patterns>]
  <patterns>  If specified, list only entries that match
Extract: tar -x [options] [<patterns>]
  <patterns>  If specified, extract only entries that match
  -k    Keep (don't overwrite) existing files
  -m    Don't restore modification times
  -O    Write entries to stdout, don't restore to disk
  -p    Restore permissions (including ACLs, owner, file flags)
bsdtar 3.6.1 - libarchive 3.6.1 zlib/1.2.13 liblzma/5.0.4 bz2lib/1.0.8 
```

You can also run native executables if you give the exact path (or add them to PATH):

```sh
~/cowasm/packages/dash-wasm$ ./bin/dash-wasm 
(CoWasm) sh$ /usr/bin/python3
Python 3.9.6 (default, Sep 13 2022, 22:03:16) 
[Clang 14.0.0 (clang-1400.0.29.102)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
>>> ^D
```

_**Piping and indirection is not implemented yet.**_

