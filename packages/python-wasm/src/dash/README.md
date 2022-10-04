status \- you can import and start dash you can a command line with editline support!

Also, input that only involves builtins may work, e.g., alias, echo, printf, setting env ars, pwd

```js
> a = require('./dist/dash/node'); await a.terminal({debug:false})
calling dash terminal... 2, /bin/dash
dash$ echo "hi "
hi 
dash$ export FOO=xyz
dash$ echo $FOO
xyz
dash$ ls
/bin/dash: 2: Cannot fork
0
```

Not surprisingly, fork/exec isn't working.   It can't work of course.  We have to understand has dash makes subprocesses then create something like fork\_exec for cpython.  That's the only hope, of course in node.  We'll also come up with something similar in browsers.

But this is exciting and it is a **real shell.**

Also, to make dash nice we'll want to make the prompt nice with 

```sh
PS1: '$(pwd | sed "s|^$HOME|~|")$ '
```

And we will need to _**implement tab completion directly in dash itself.**_   I guess people have never done that, but I don't think it should be difficult.

I also hardcoded using emacs mode but we could make that configurable.

Dash's error handling works via setjmp/longjmp, so any error at all breaks things:

```sh
dash$ echo "foo" > bar
/bin/dash: 3: cannot create bar: Directory nonexistent
Uncaught RuntimeError: unreachable
...
```

I'm not sure how to solve this, except with some reorg of their code, combined with hoisting some code up to Javascript \-\- i.e., make the main repl loop be javascript calling some code in libdash.a.  But their code is so readable that this should be do\-able.

