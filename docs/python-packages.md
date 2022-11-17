For everything we support, we'll have a single .tar.xz file with the import name of the module.  Our .tar.xz is:

- precompiled \-\- it has only .pyc files \(no .py\)
- strips out stuff that isn't typically needed, e.g., the test files

That said, a lot of these get regularly updated and are pure python, so I'm a bit torn.

Hmm.   The size is a factor of 20x in a lot of cases, e.g., a normal sympy install is 118M, but a stripped tar.xz pre\-compiled bundle is 5.0MB.  This is because \(a\) tests, \(b\) both py and pyc, and \(c\) not being compressed \(just compressing only gets it from 118MB to 14MB\).

## The List

- [ ] urllib3 \(and certifi\)
- [ ] requests
- [ ] charset\-normalizer
- [ ] typing\-extensions
- [ ] idna
- [ ] certifi
- [x] python\-dateutil
- [x] six
- [ ] pyyaml #c
- [ ] cryptography \- but have to stick with version 3.4.x from a year ago in order to disable rust: [https://github.com/pyca/cryptography/issues/5771\#issuecomment\-775016788](https://github.com/pyca/cryptography/issues/5771#issuecomment-775016788) 
- [ ] \(?\) wheel
- [x] pytz
- [ ] pyparsing \(easy\)
- [ ] pytest
- [x] sympy
- [ ] scipy
- [ ] pillow
- [ ] jinja2
- [ ] pycparser
- [ ] lxml
- [ ] scikit\-learn
- [ ] scikit\-image
- [ ] matplotlib
- [ ] networkx
- [ ] ipython \- this is a nontrivial challenge, with uses of pexpect, curses, etc. and like 15 other dependencies.
- [ ] tensorflow
- [x] cython
- [x] numpy

## Sources and inspiration

### Top Downloaded Packages

This list [https://hugovk.github.io/top\-pypi\-packages/](https://hugovk.github.io/top-pypi-packages/) has the most downloaded, etc., packages.  The top one is some AWS SDK, which makes no sense for CoWasm, but other packages like numpy and pandas \(which we have, of course\) do make sense.  Let's make a todo list here of our top priority packages.  Note that most of these should be trivial to install with `python-wasm -m pip install.`  The interesting challenge will be to do that, then also make .tar.xz bundles of them that work, etc.   Also, for the ones that need to be compiled, that is a challenge one\-by\-one.

### CoCalc's list

Another interesting list is our software: https://cocalc.com/software/python 

This is much more challenging

### Pyodide's list

See this directory: https://github.com/pyodide/pyodide/tree/main/packages Some of these are Python packages.

