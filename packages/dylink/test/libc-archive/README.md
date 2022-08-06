The goal here is to build libc into a shared library.

We have stopped for now on that goal.  It would require modifying zig/src/musl.zig to 

There's no good reason for our application to make libc dynamic.

Instead we should work better to automatically and properly expose all of libc statically linked into the base.

I copied libc.a from the zig cache (is there a better way)?
Then got all the symbols defined there:

```sh
nm -jgU libc.a |grep -v : | grep -v " W "|sort|uniq > all-symbols.txt
nm -jgU libc.a |grep -v :|sort|uniq |grep -v ^_ > all-symbols.txt


nm -gU libc.a |grep -v :|grep -v W|awk '{print $3}' |sort|uniq |grep -v ^_ > all-symbols.txt

```

