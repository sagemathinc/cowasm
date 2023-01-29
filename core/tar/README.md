# Libarchive: tar-wasm  tar for web assembly

This is the BSD version of tar, built to run in WebAssembly via CoWasm, with
support for several compression formats:

```sh
~/cowasm/packages/libarchive$ cowasm dist/wasm/bin/tar -h
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

There are of course issues, given that WASI makes it impossible to fully
support chmod.  For example, if you create a tarball with an executable file
in it, then extract it, the file no longer has the executable bit set.

I tried benchmarks against the version of this code included in MacOS, and
the speed is pretty close.  That's impressive.

## Using this with Node.js

This seems to fully work, except for the mod issue mentioned above.

## Using in the browser

I expect there will be a number of system calls that are not implemented, e.g., involving dup'ing file descriptors, etc.  This isn't going to work in the browser until that is done, but it is pretty straightforward.
