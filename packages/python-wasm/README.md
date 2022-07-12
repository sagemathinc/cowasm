# python-wasm

## Quickstart in Node.js

```
npm install python-wasm
```

Then

```js
$ node
Welcome to Node.js v16.15.1.
Type ".help" for more information.
> const python = require('python-wasm')
> await python.init()
> python.exec('a = 2 + 3; a')
5
> python.repr('a')
5
> python.exec('import sys; sys.platform')
'wasi'
```

## Webpack

See https://github.com/sagemathinc/wapython/tree/main/packages/webpack

