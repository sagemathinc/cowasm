# python-wasm

## Quickstart

```
npm install python-wasm
```

Then

```sh
$ node
Welcome to Node.js v16.15.1.
Type ".help" for more information.
> const {python} = require('python-wasm')
> await python.init()
> python.exec('2+3')
5