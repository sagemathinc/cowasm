"""
This tiny simple custom importer makes it so we can if you have a
tarball foo.tar.xz somewhere in your sys.path that contains a Python
module, then this works:

    import foo

This even works with .so extension module code. It's reasonably
efficient too, in some ways.  How is this possible?  This works in a
very different way than Python's own zipfile importer and to me it
is both much simpler and much better.  At
   https://docs.python.org/3/library/zipfile.html#pyzipfile-objects
there are docs about turning a Python module (without extension code)
into a zip file which can then be exported.   It works for that
application, but has drawbacks because zip files are much larger than
.tar.xz files; also, it seems like importing is a bit slower.  What
we do here instead is much simpler -- we just automaticlaly extract
the .tar.xz file to a temporary folder, which we add to sys.path.
That's it!  It's ridiculously simple, but works well for our application
to WebAssembly where small size is very important.

NOTES:

- See https://dev.to/dangerontheranger/dependency-injection-with-import-hooks-in-python-3-5hap

- When working on this, here's how to update things after a change:

~/cowasm/packages/cpython$  rm dist/wasm/.install-data && cp src/cowasm_importer.py dist/wasm/lib/python3.11/site-packages/ && make && cd ../python-wasm/ && make && cd ../cpython/

"""

import importlib
import importlib.abc
import os
import sys
import tempfile
import zipfile
import tarfile
from time import time

cowasm_modules = {}

verbose = 'cowasm:importer' in os.environ.get("DEBUG", '')

EXTENSION = '.tar.xz'

if verbose:

    def log(*args):
        print(*args)
else:

    def log(*args):
        pass


temporary_directory = None


def site_packages_directory():
    for path in sys.path:
        if path.endswith('/site-packages'):
            # In dev mode using the real filesystem
            return path
    # didn't find it so try again with different heuristic
    for path in sys.path:
        if path.endswith('/lib-dynload'):
            # this is typically inside site-packages
            return os.path.dirname(path)


def get_package_directory():
    # We use a temporary directory that gets
    # deleted automatically when the process exits, hence the global
    # temporary_directoy object is important.  A drawback of this approach is
    # that every time you start python and import something
    # the module has to get uncompressed again; an advantage is that space is
    # only used when you actually import the module, and probably most modules
    # are never used at all.     That also breaks Cython, which we work around
    # by putting a cython.py file in site-packages, and also Cython vs cython
    # is an issue there.  (We work around the cython.py thing for now.)

    global temporary_directory
    if temporary_directory is None:
        temporary_directory = tempfile.TemporaryDirectory()
        sys.path.insert(0, temporary_directory.name)
    return temporary_directory.name


class CoWasmPackageFinder(importlib.abc.MetaPathFinder):

    def __init__(self, loader):
        self._loader = loader

    def find_spec(self, fullname, path, target=None):
        """
        - fullname is the fully-qualified name of the module,
        - path is set to __path__ for sub-modules/packages, or None otherwise.
        - target can be a module object, but is unused in this example.
        """
        log("find_spec:", fullname, path, target)
        if self._loader.provides(fullname):
            return self._gen_spec(fullname)

    def _gen_spec(self, fullname):
        return importlib.machinery.ModuleSpec(fullname, self._loader)


class CoWasmPackageLoader(importlib.abc.Loader):

    def provides(self, fullname: str):
        return path_to_bundle(fullname) is not None

    def _do_import(self, name, path):
        log("_do_import", name, path)
        mod = extract_archive_and_import(name, path)
        # We save the spec so we can use it to proxy get_code, etc.
        # TODO: I don't actually know if any of this proxying really works.
        # I implemented this in hopes of getting "-m pip" to work as a bundle,
        # but it doesn't.
        self._spec = mod.__spec__
        return mod

    def create_module(self, spec):
        log("create_module", spec)
        path = path_to_bundle(spec.name)
        return self._do_import(spec.name, path)

    def exec_module(self, module):
        pass

    def get_code(self, fullname):
        log("get_code", fullname)
        if not hasattr(self, '_spec'):
            path = path_to_bundle(fullname)
            self._do_import(fullname, path)
        return self._spec.loader.get_code(fullname)

    def get_data(self, fullname):
        if not hasattr(self, '_spec'):
            path = path_to_bundle(fullname)
            self._do_import(fullname, path)
        return self._spec.loader.get_data(fullname)

    def get_filename(self, fullname):
        if not hasattr(self, '_spec'):
            path = path_to_bundle(fullname)
            self._do_import(fullname, path)
        return self._spec.loader.get_filename(fullname)

    def get_source(self, fullname):
        if not hasattr(self, '_spec'):
            path = path_to_bundle(fullname)
            self._do_import(fullname, path)
        return self._spec.loader.get_source(fullname)

def extract_archive_and_import(name: str, archive_path: str):
    archive_path = cowasm_modules[name]
    package_dirname = get_package_directory()

    if verbose:
        t = time()
        log("extracting archive", archive_path, " to", package_dirname)

    try:
        if archive_path.endswith('.zip'):
            zipfile.ZipFile(archive_path).extractall(package_dirname)
        else:
            tarfile.open(archive_path).extractall(package_dirname)
    finally:
        # Once we even try to extract, make it impossible that our importer will ever
        # try again on this module -- this avoids any possibility of an infinite loop
        del cowasm_modules[name]

    # Updating the directory timestamp should be automatic on any OS,
    # but *right now* it is not with memfs, so we do it manually.
    # (That said, I think I patched around this.)
    # Also this can workaround issues. Basically this is clearing the python
    # cache.  Sometimes on linux vm's, this is critical.
    import pathlib
    pathlib.Path(package_dirname).touch()
    # Alternatively, invalidating the cache should work no matter what,
    # and is recommended in the docs, so we do it:
    importlib.invalidate_caches()

    if verbose:
        log(time() - t, package_dirname)

    if verbose: t = time()

    mod = importlib.import_module(name)

    if verbose:
        log(name, "import time: ", time() - t)

    return mod


def path_to_bundle(module_name: str):
    if module_name in cowasm_modules:
        return cowasm_modules[module_name]
    # Search the import path
    filename = module_name + EXTENSION
    for segment in sys.path:
        path = os.path.join(segment, filename)
        if os.path.exists(path):
            log("path_to_bundle: found", path)
            cowasm_modules[module_name] = path
            return path
    # We do not have it now.  It could get added later.
    # TODO: should I add a timestamp based hash like
    # the builtin import process?
    return None


def init():

    if 'PYTHONREGRTEST_UNICODE_GUARD' in os.environ:
        # do not install or use this when running tests, as it changes
        # the path which breaks some tests.
        return

    if "COWASM_DISABLE_IMPORTER" in os.environ:
        return

    loader = CoWasmPackageLoader()
    finder = CoWasmPackageFinder(loader)
    sys.meta_path.append(finder)
