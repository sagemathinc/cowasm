# Hacking pylang

The pylang compiler is written in pylang itself and uses the pylang import system to modularize its code. The compiler source code isin the `src` directory. The compiled compiler is by default in the `release`directory. The compiler itself _**only takes a few seconds**_ to build from source and bootstrap itself.

In order to start hacking on the compiler, run the command

```sh
npm run test
```

This will generate a build of the compiler in the `dev` directory. Now, the`pylang` command will automatically use this build, rather than the one inrelease. If you want to go back to the release build, simply delete the `dev`directory.

## Code organization

The way the compiler works, given some pylang source code:

- The source code is lexed into a stream of tokens (`src/tokenizer.py`)
- The tokens are parsed into a Abstract Syntax Tree (`src/parse.py and src/ast_types.py`). During parsing any import statement are resolved. This is different from Python, where imports happen at runtime, not compile time; an implication is that if an import would fail at runtime in Python, it will fail at compile time here, so you can't include imports that will fail only when certain code runs.
- The Abstract Syntax Tree is transformed into the output JavaScript (`src/output/*.py`)
- Various bits of functionality in pylang depend upon the _Base Library_
  (`src/baselib*.py`). This includes things like the basic container types
  (list/set/dict) string functions such as `str.format()`, etc. The baselib
  is automatically inserted into the start of the output JavaScript.

The pylang standard library can be found in `src/lib`. The various tools,such as the the REPL, etc. are in the `tools`directory.

## Tests

The tests are in the test directory and can be run using the command:

```
pylang test
```

You can run individual test files by providing the name of the file, as

```
pylang test test/generic.py
```

## Modifying the compiler

Edit the files in the `src` directory to make your changes, then do `npm run test` to test them. This will compile an updated version of the compiler with your changes, if any, and use it to run the test suite. You can also use `try.py` to test specific things. For example:

```sh
~/pylang $ ./try.py 'print("Hello world")'
```

will compile `print ("Hello world")` and show you the compilation output on
stdout. You can tell it to omit the baselib, so you can focus on the output,
with the `-m` switch, like this:

```sh
~/pylang $ ./try.py -m 'print("Hello world")'
There are changes to the source files of the compiler, rebuilding
Compiler built in 0.899 seconds

(function(){
    "use strict";
    (function(){
        var __name__ = "__main__";
        print("Hello world");
    })();
})();
```

You can also have it not print out the JavaScript, instead directly executing the output
JavaScript with the `-x` switch, like this

```sh
~/pylang $ ./try.py -x 'print("Hello world")'
```

If you want to test longer sections of code, you can use the `-f` switch to
pass in the path to a pylang file to compile, like this:

```sh
~/pylang $ ./try.py -f myfile.py
```

Once you are happy with your changes, you can build the compiler and run the
test suite, all with a single command:

```sh
~/pylang $ npm run test
```

This will build the compiler with the updated version of itself and then run the test suite.
