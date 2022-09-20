## Posix-browser

This will be an analogue of [https://www.npmjs.com/package/posix\-node](https://www.npmjs.com/package/posix-node) but for a web browser.  The package posix\-node defines a Javascript API that can be used to fill in missing posix functionality for a node.js application.  This module will provide the same API, but of course with much different or limited functionality in the browser, because there's no posix C api available there.  The key thing this will provide is an implementation of a combined "fork_exec" to support webassembly subprocesses for python-wasm.

**This does not exist yet, except in my brain.**  It is key step in fully developing https://zython.org/ to have similar functionality between the browser and server.