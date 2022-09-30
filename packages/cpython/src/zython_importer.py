# See https://dev.to/dangerontheranger/dependency-injection-with-import-hooks-in-python-3-5hap

import importlib
import importlib.abc
import sys

zython_modules = {
    'mpmath':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-mpmath/dist/wasm/mpmath.zip',
    'sympy':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-sympy/dist/wasm/sympy.zip',
    'numpy':
    '/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/zython/packages/py-sympy/dist/wasm/numpy.zip',
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

    def provides(self, fullname):
        return zython_modules.get(fullname.split('.')[0]) is not None

    def create_module(self, spec):
        print("create_module", spec)
        path = zython_modules.get(spec.name.split('.')[0])
        if path is None:
            raise ImportError
        try:
            sys.path.insert(0, path)
            mod = importlib.import_module(spec.name)
            return mod
        finally:
            del sys.path[0]

        # Still here?  Someday we'll implement importing dynamic libraries
        # directly from the bundle, but not today.
        return {'fail':path}

    def exec_module(self, module):
        pass


def install():
    loader = ZythonPackageLoader()
    finder = ZythonPackageFinder(loader)
    sys.meta_path.append(finder)


if __name__ == "__main__":
    install()
    import mpmath
    import sympy
    #import numpy
    print(mpmath)
