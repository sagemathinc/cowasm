# See https://dev.to/dangerontheranger/dependency-injection-with-import-hooks-in-python-3-5hap

import importlib
import importlib.abc
import os
import sys
import tempfile
import zipfile
import tarfile
from time import time

zython_modules = {}

verbose = 'zython:importer' in os.environ.get("DEBUG", '')

temporary_directory = None


def get_package_directory():
    # We try to find site-packages, and if so, use that:
    # I like this since efficient, but I hate that it adds an
    # additioanl "sources of truth".

    #     for path in sys.path:
    #         if path.endswith('site-packages'):
    #             # In any dev mode using the real filesystem
    #             return path

        # TODO:
        # This won't work and I don't understand why.  My best guess is yet
        # another subtle unionfs bug.  Try again after rewriting to not use
        # unionfs -- hopefully it's not a memfs problem.
        #     if '/usr/lib/python3.11' in sys.path:
        #         # Using memfs (the non-dev mode).
        #         path = '/usr/lib/python3.11/site-packages'
        #         os.makedirs(path, exist_ok=True)
        #         sys.path.insert(0, path)
        #         return path

    # If not, we fall back to a temporary directory that gets
    # deleted automatically when the process exits, hence the global
    # temporary_directoy object is important.  This approach is
    # really bad, since every time you start python and import something
    # the module has to get uncompressed again.  That also breaks Cython,
    # which also puts a cython.py file in site-packages on first import.
    # (We work around the cython.py thing for now.)

    global temporary_directory
    temporary_directory = tempfile.TemporaryDirectory()
    sys.path.insert(0, temporary_directory.name)
    return temporary_directory.name


package_dirname = get_package_directory()


class ZythonPackageFinder(importlib.abc.MetaPathFinder):

    def __init__(self, loader):
        self._loader = loader

    def find_spec(self, fullname, path, target=None):
        """
        - fullname is the fully-qualified name of the module,
        - path is set to __path__ for sub-modules/packages, or None otherwise.
        - target can be a module object, but is unused in this example.
        """
        if os.environ.get("ZYTHON_DISABLE_IMPORTER", False):
            return
        if verbose:
            print("find_spec", fullname, path, target)
        if self._loader.provides(fullname):
            return self._gen_spec(fullname)

    def _gen_spec(self, fullname):
        return importlib.machinery.ModuleSpec(fullname, self._loader)


class ZythonPackageLoader(importlib.abc.Loader):

    def provides(self, fullname: str):
        return zython_modules.get(fullname) is not None

    def create_module(self, spec):
        if verbose: print("create_module", spec)
        path = zython_modules.get(spec.name)
        return extract_archive_and_import(spec.name, path)

    def exec_module(self, module):
        pass


def extract_archive_and_import(name: str, archive_path: str):
    archive_path = zython_modules[name]

    if verbose:
        t = time()
        print("extracting archive", archive_path, " to", package_dirname)

    try:
        if archive_path.endswith('.zip'):
            zipfile.ZipFile(archive_path).extractall(package_dirname)
        else:
            tarfile.open(archive_path).extractall(package_dirname)
    finally:
        # Once we even try to extract, make it impossible that our importer will ever
        # try again on this module -- this avoids any possibility of an infinite loop
        del zython_modules[name]

    if verbose:
        print(time() - t, package_dirname)

    if verbose: t = time()

    mod = importlib.import_module(name)

    if verbose:
        print("module import time: ", time() - t)

    return mod


def init():
    loader = ZythonPackageLoader()
    finder = ZythonPackageFinder(loader)
    sys.meta_path.append(finder)


init()


def install(modules):
    for name in modules.keys():
        zython_modules[name] = modules[name]
