# ZASH -- a WebAssembly shell for Zython built on the Debian Almquist Shell

I don't know if this will ever actually be usable, but I hope so.  We'll see.

### Goal

The goal is first to make it usable on the server via node.js, then later make a
version that is also usable in the browser but can of course only run
WebAssembly modules there. The latter will also naturally encourage us to port a
suite of command line tools such as `ls` and `less,` possibly using https://github.com/DiegoMagdaleno/BSDCoreUtils, but maybe using https://github.com/mirror/busybox.

### Why not bash or zsh?

The main reason to go with dash instead of bash or zsh is that the latter two are at least **10x more** lines of code. Of course I'm tempted to just write a shell from scratch that is adapted to our unique needs here, but I think it'll be much better to _**start with dash**_ as a foundation, then build on that.  Dash probably has [very few bugs](https://bugs.debian.org/cgi-bin/pkgreport.cgi?pkg=dash;dist=unstable), and the design and implementation is clearly very fast, due to early constraints.  If you read [the dash source code TOUR](https://github.com/sagemathinc/dash/blob/main/src/TOUR) you see that there's nontrivial choice of data structure to optimize performance on early slow late 80's computers.

Another reason to use dash is that bash and zsh use readline or complicated built\-in terminal functionality, whereas **dash uses** **`editline`** **only,** and editline just happens to be exactly the line editing library I have got to fully work for Zython, so it makes sense to double down on it for technical reasons \(in addition to license reasons\).

## Issues to fix in order to make this usable

### [ ] Error handling uses setjmp/longjmp but WASM doesn't support them

If any error occurs it crashes everything due to using setjmp/longjmp.  According to the TOUR (in the dash source code): 

> "The C language doesn't include exception handling, so I implement it using setjmp and longjmp. "

WASM doesn't have those, so we need to restructure the entire code to somehow
not use them, probably with a bunch of error code return values?  The Python REPL does fine without them, so dash can.  I think bash also can be built maybe without
setjmp support, so if this proves impossible to fix, we may have to switch.

### [ ] Tab completion

When entering input, we do get emacs or vim linedit support.  However, there is no
tab completion, which makes it basically unusable.  This might be easy to add
at least for basic things, i.e., files in the current directory, though obviously
not really complicated completions for subcommands.

### [ ] Creating a file to redirect output to doesn't work

This fails:

```sh
echo "foo" > a
```

It might just be a "current working directory" sync issue.  Not sure.

### [ ] Signals

E.g., try

```sh
dash$ viz-native
... runs editor
... hit control+c
... crashes out of wasm entirely
```

### [ ] Piping prints a big error, but also outputs the correct output

```sh
dash$ echo "hello" | sed "s|h|j|"
dash$ Uncaught RuntimeError: unreachable
    at exraise (wasm://wasm/008d4ef2:wasm-function[2656]:0x83e23)
    at evaltree (wasm://wasm/008d4ef2:wasm-function[2231]:0x680f0)
    at evaltreenr (wasm://wasm/008d4ef2:wasm-function[2242]:0x69464)
    at evalpipe (wasm://wasm/008d4ef2:wasm-function[2237]:0x68d75)
    at evaltree (wasm://wasm/008d4ef2:wasm-function[2231]:0x680b2)
    at cmdloop (wasm://wasm/008d4ef2:wasm-function[2681]:0x85124)
    at dash_main (wasm://wasm/008d4ef2:wasm-function[2679]:0x84ff7)
    at dash.dash.terminal (wasm://wasm/008d4ef2:wasm-function[2699]:0x853be)
    at terminal (wasm://wasm/008d4ef2:wasm-function[2708]:0x85801)
    at terminal.command_export (wasm://wasm/008d4ef2:wasm-function[4506]:0xd478e)
> jello

dash$ 
```

### [ ] Implement fork\+exec that is pure WASM and also works in the browser

_**This is by far the most interesting and important task. Plan:**_

- \(done\) very basic vforkexec in nodejs only, which is easier since no io capture; no webworker
- vforkexec from a webworker, with stdio working properly
  - this is tricky because it needs to be proxied and just using child\_process doesn't work, since it's not directly using stdio.  
- vforkexec in browser with 1 or 2 trivial non\-wasm in js commands
  - then with actual ls running via wasm!
- make vforkexec inherit environment properly
- exec with pipes that do capture output in server
- exec with pipes in browser 

---

#### further thoughts...

Unwind the data structures and exactly what happens with this function
and related ones:

```c
struct job *vforkexec(union node *n, char **argv, const char *path, int idx)
```

and make a version that doesn't call fork or exec and instead using the
runtime to call other WebAssembly modules.

NOTE: I'm aware that pure fork and pure exec are impossible in a browser. But the combination
is what is really used, and I believe that is possible.

I think the key to this is implemented enough of a flakie posix\-node to help me understand what is going on in terms of input, output, etc., and what dash **expects.**  Then designing an API to do that.

### [ ] UTF-8 support

I know dash built properly should have full utf8 support, e.g., because
the native ones in both Ubuntu and macOS do.  Right now, utf8 works fine
in output, but is echoed back incorrectly in the input:

```sh
~/zython/packages/python-wasm$ node
Welcome to Node.js v18.10.0.
Type ".help" for more information.
> a = require('./dist/dash/node'); await a.terminal({debug:true})
calling dash terminal... 2, /bin/dash
dash$ echo "You can us\U+DFC3\U+DFA9 utf-8: \U+DFF0\U+DF9F\U+DF98\U+DF80"
You can usé utf-8: 😀
dash$ 
```

### [ ] Prompt appears before/during output; subprocess is returning instantly

For some reason the prompt appears along with the output, rather than after
it.  It seems to be some issue with wait and how output works.  

```sh
dash$ date
dash$ Fri Oct  7 08:49:07 PDT 2022
```

A better example is sleep:

```sh
dash$ sleep 5
dash$ # immediately
```

Here sleep appears to immediately return, but is running.

### [ ] make history persist between sessions

The history needs to be saved to a file and loaded...

Related to this, make it so typing "history" shows the history. I.e., implement a builtin.

Another thing, make it so `!v` runs the last command that starts with "v", etc.

### [ ] make it possible load and run a script:

```sh
~/zython/packages/python-wasm$ echo 'echo "hello"' > a.sh
~/zython/packages/python-wasm$ cat a.sh
echo "hello"
~/zython/packages/python-wasm$ zash-debug a.sh
/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/python-wasm/bin/zash-debug: 0: 4: Invalid argument
wasm://wasm/008ca392:1


RuntimeError: unreachable
...

~/zython/packages/python-wasm$ zash-debug
zash$ . a.sh
/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/python-wasm/bin/zash-debug: 1: .: a.sh: not found
wasm://wasm/008ca392:1


RuntimeError: unreachable
```

### [x] Create zash and zash-debug scripts, passing in all command line args

This is easy.  Just do analogue of `zython-*` scripts.

## Related projects

- Something like this was attempted many years ago using busybox and emscripten: [https://github.com/tbfleming/em\-shell](https://github.com/tbfleming/em-shell)
- After I mostly finished this somebody posted a dash to WAPM: https://wapm.io/sharrattj/dash   I can't make heads or tails of it.

