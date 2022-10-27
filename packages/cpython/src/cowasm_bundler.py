"""
Creates a "CoWasm bundle", which is a PyZipFile (so has pyc files),
plus we also include .so files and possibly some other extra files
on a case-by-case basis.  There is no version information, since that's
going to be in the npm package.json file, and obviously no architecture
since there is only one architecture.

We are going to **attempt** to change cpython to allow importing CoWasm
bundles, i.e., so files as part of zips.  This impossible in a traditional
OS, but we are writing the OS and control the dynamic linker, so it should
be possible.

The idea of making Python modules only available in maximally compiled
zip archive form is very inspired by Javascript web bundlers.  It is
is antithetical to how wheels, and Python packaging generally works!
But that is because the constraints are very, very different.

We will move this code to another package once it stabilizes and we use it for
multiple modules.
"""

import io, os, sys, tarfile, time, zipfile


class CoWasmBundle(zipfile.PyZipFile):

    def __init__(self, *args, **kwds):
        zipfile.PyZipFile.__init__(self, *args, **kwds)
        self.debug = 1
        self.compresslevel = 9

    def write_so(self, pathname, basename="", filterfunc=None):
        pathname = os.fspath(pathname)
        if filterfunc and not filterfunc(pathname):
            if self.debug:
                label = 'path' if os.path.isdir(pathname) else 'file'
                print('%s %r skipped by filterfunc' % (label, pathname))
            return
        dir, name = os.path.split(pathname)
        if os.path.isdir(pathname):
            initname = os.path.join(pathname, "__init__.py")
            if os.path.isfile(initname):
                # This is a package directory, add it
                if basename:
                    basename = "%s/%s" % (basename, name)
                else:
                    basename = name
                if self.debug:
                    print("Adding package in", pathname, "as", basename)
                dirlist = sorted(os.listdir(pathname))
                dirlist.remove("__init__.py")
                # Add all *.so files and package subdirectories
                for filename in dirlist:
                    path = os.path.join(pathname, filename)
                    root, ext = os.path.splitext(filename)
                    if os.path.isdir(path):
                        if os.path.isfile(os.path.join(path, "__init__.py")):
                            # This is a package directory, recurse:
                            self.write_so(
                                path, basename,
                                filterfunc=filterfunc)  # Recursive call
                    elif ext == ".so":
                        if filterfunc and not filterfunc(path):
                            if self.debug:
                                print('file %r skipped by filterfunc' % path)
                            continue
                        arcname = self.get_archive_name(path, basename)
                        if self.debug:
                            print("Adding", arcname)
                        self.write(path, arcname)
            else:
                pass
        elif os.path.splitext(pathname)[1] == '.so':
            arcname = self.get_archive_name(pathname, basename)
            if self.debug:
                print("Adding file", arcname)
            self.write(pathname, arcname)

    def write_all(self, pathname, basename=""):
        pathname = os.fspath(pathname)
        if os.path.isdir(pathname):
            # This is a directory; add it
            _, name = os.path.split(pathname)
            if basename:
                basename = "%s/%s" % (basename, name)
            else:
                basename = pathname
            if self.debug:
                print("Adding package in", pathname, "as", basename)
            dirlist = sorted(os.listdir(pathname))
            # Add everything
            for filename in dirlist:
                path = os.path.join(pathname, filename)
                root, ext = os.path.splitext(filename)
                if os.path.isdir(path):
                    # This is a directory, recurse:
                    self.write_all(path, basename)  # Recursive call
                else:
                    arcname = self.get_archive_name(path, basename)
                    if self.debug:
                        print("Adding", arcname)
                    self.write(path, arcname)
        else:
            arcname = os.path.join(basename, pathname)
            if self.debug:
                print("Adding file", arcname)
            self.write(pathname, arcname)

    def get_archive_name(self, path, basename):
        arcname = os.path.split(path)[1]
        if basename:
            arcname = os.path.join(basename, arcname)
        return arcname

def create_bundle(name, extra_files):

    def notests(s):
        fn = os.path.basename(s)
        return (not ('/tests/' in s or fn.startswith('test_')))

    # Python stdlib uses the same options as below, and it's easiest
    # to work with these params using possibly older versions of zip.
    # NOTE: compression=zipfile.ZIP_LZMA is a bit smaller, but fails on import, probably
    # due to a subtle issue with webassembly.  We will revisit this later.

    with CoWasmBundle(f'{name}.zip',
                      'w',
                      optimize=2,
                      compression=zipfile.ZIP_DEFLATED) as zp:
        zp.writepy(name, filterfunc=notests)
        zp.write_so(name, filterfunc=notests)
        for extra in extra_files:
            print(f"Including extra '{extra}'")
            zp.write_all(extra)

    # Also create a tar.xz by *converting* the zip.  We do this partly since
    # there's a lot of work into making a zip with the correct contents in it,
    # both above and in the cpython zipfile module, and we reuse that effort.
    #
    # These .tar.xz are much smaller, e.g., often 50% the size, and we
    # support importing them.  The recipe below to convert a zip into a tar
    # is inspired by
    #    https://unix.stackexchange.com/questions/146264/is-there-a-way-to-convert-a-zip-to-a-tar-without-extracting-it-to-the-filesystem
    tar = tarfile.open(f'{name}.tar.xz', "w:xz")
    zip = zipfile.ZipFile(f'{name}.zip', "r")
    now = time.time()
    for filename in zip.namelist():
        if filename.endswith('/'): continue
        data = zip.read(filename)
        tarinfo = tarfile.TarInfo()
        tarinfo.name = filename
        tarinfo.size = len(data)
        tarinfo.mtime = now
        tar.addfile(tarinfo, io.BytesIO(data))

    # Finally, we delete the zip, since it wastes space and we are not using it.
    os.unlink(f'{name}.zip')


if __name__ == '__main__':
    create_bundle(sys.argv[1], sys.argv[2:])
