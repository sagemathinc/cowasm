# See https://dev.to/dangerontheranger/dependency-injection-with-import-hooks-in-python-3-5hap

import importlib
import importlib.abc
import sys
import tempfile
import zipfile

zython_modules = {
    'mpmath':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-mpmath/dist/wasm/mpmath.zip',
    'sympy':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-sympy/dist/wasm/sympy.zip',
    'numpy':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-numpy/dist/wasm/numpy.zip',
}


class ZythonPackageFinder(importlib.abc.MetaPathFinder):

    def __init__(self, loader):
        self._loader = loader

    def find_spec(self, fullname, path, target=None):
        """
        - fullname is the fully-qualified name of the module,
        - path is set to __path__ for sub-modules/packages, or None otherwise.
        - target can be a module object, but is unused in this example.
        """
        if self._loader.provides(fullname):
            return self._gen_spec(fullname)

    def _gen_spec(self, fullname):
        spec = importlib.machinery.ModuleSpec(fullname, self._loader)
        return spec


class ZythonPackageLoader(importlib.abc.Loader):

    def __init__(self):
        self._creating = set([])

    def provides(self, fullname):
        name = fullname.split('.')[0]
        # important to not say we provide package *while loading it*, since
        # during the load we switch to creating something else to provide it.
        return name not in self._creating and \
                zython_modules.get(name) is not None

    def create_module(self, spec):
        print("create_module", spec)
        name = spec.name.split('.')[0]
        path = zython_modules.get(name)
        try:
            self._creating.add(name)
            sys.path.insert(0, path)
            return importlib.import_module(spec.name)
        except:
            return extract_zip_and_import(spec.name, zython_modules[name])
        finally:
            self._creating.remove(name)
            del sys.path[0]

        # Still here?  Someday we'll implement importing dynamic libraries
        # directly from the bundle, but not today.
        return {'fail': path}

    def exec_module(self, module):
        pass

# Benchmark -- doing it this way (extract and delete)
# for numpy takes 0.5 seconds instead of the 0.3 seconds
# it would likely take with zip import that supports so,
# which we can implement at some point later.
def extract_zip_and_import(name, zip_path):
    with tempfile.TemporaryDirectory() as tmpdirname:
        zip_path = zython_modules[name]
        from time import time; t = time()
        zipfile.ZipFile(zip_path).extractall(tmpdirname)
        print(time()-t, tmpdirname)
        import os
        print(os.listdir(tmpdirname))
        try:
            sys.path.insert(0, tmpdirname)
            t=time()
            return importlib.import_module(name)
        finally:
            del sys.path[0]


def install():
    loader = ZythonPackageLoader()
    finder = ZythonPackageFinder(loader)
    sys.meta_path.append(finder)


if __name__ == "__main__":
    install()
    print(sys.path)
    import mpmath; print(mpmath)
    import sympy; print(sympy)
    import numpy; print(numpy)
    print(sys.path)
