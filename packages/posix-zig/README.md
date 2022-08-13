# Node.js Native Module written in Zig

Node.js Native Modules are typically written in C++, but you can write them also in other languages like Rust ([1], [2]), too. [Zig](https://ziglang.org/) is a new low-level programming language that competes with C, integrating seemlessly with C libraries without FFI or bindings.

This project is an example Hello World for making a Node.js native module in Zig.

The entry point is `src/lib.zig`.

Test this project like this:

1. Git clone it
2. `npm install` (will download Node.js header files)
3. `npm run build` (will compile the Zig project and produce `dist/lib.node`)
4. `npm run test` (will call the `greet()` function from Zig)

## Why Zig?

Writing C/C++ in 2021 is difficult, confusing, verbose, antiquated. (Disclaimer: I have written many thousands lines of code of C/C++ in my lifetime, I know what I'm talking about) But writing native Node.js modules is a superpower for achieving better performance. I've been hyped about using Rust for Node.js native modules, but [my experience in practice has been full of obstacles](https://staltz.com/rust-for-mobile-not-yet.html). Now, I'm giving Zig a try. It can produce small binaries with great performance, it builds for all targets I can imagine (out of the box), and is overall a simple and approachable language built for the year 2021. It certainly feels like a young language, but let's test it out, I guess.

## License and acknowledgements

Code here is licensed `Unlicense`, except for `src/translate.zig` which was copied from [Tigerbeetle-node](https://github.com/coilhq/tigerbeetle-node) and is licensed Apache-2.0 by Coil Technologies, Inc.

Overall I don't think I would have been able to figure out this example project alone so quickly, so huge thanks to Coil Technologies, Inc. for making an open source node.js native module written in Zig.

[1]: https://github.com/neon-bindings/neon
[2]: https://github.com/infinyon/node-bindgen
