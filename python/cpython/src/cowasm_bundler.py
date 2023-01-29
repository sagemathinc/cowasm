"""
Creates a "CoWasm bundle", which is a PyZipFile (so has pyc files),
plus we also include .so files and possibly some other extra files
on a case-by-case basis.  There is no version information, since that's
going to be in the npm package.json file, and obviously no architecture
since there is only one architecture.

The idea of making Python modules only available in maximally compiled
zip archive form is very inspired by Javascript web bundlers.  It is
is antithetical to how wheels, and Python packaging generally works!
But that is because the constraints are very, very different.
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

    # We use an in-memory buffer, since writing to disk then reading
    # back triggers some WASI sync issues right now (TODO), and of course
    # we don't need a file anyways since we just convert to a tarball below.
    # To see this bug though, try to bundle the sympy package on macOS.
    # Second we don't compress since we're just going to extract it again
    # below, so it would be a waste of time.
    zip = CoWasmBundle(io.BytesIO(),
                      'w',
                      compression=zipfile.ZIP_STORED)
    zip.writepy(name, filterfunc=notests)
    zip.write_so(name, filterfunc=notests)
    for extra in extra_files:
        print(f"Including extra '{extra}'")
        zip.write_all(extra)

    # Create a tar.xz by *converting* the zip.  We do this partly since
    # there's a lot of work into making a zip with the correct contents in it,
    # both above and in the cpython zipfile module, and we reuse that effort.
    #
    # These .tar.xz are much smaller, e.g., often 50% the size, and we
    # support importing them.  The recipe below to convert a zip into a tar
    # is inspired by
    #    https://unix.stackexchange.com/questions/146264/is-there-a-way-to-convert-a-zip-to-a-tar-without-extracting-it-to-the-filesystem
    # Note that npm also uses tarballs rather than zip for its packages.

    tar = tarfile.open(f'{name}.tar.xz', "w:xz")
    now = time.time()
    for filename in zip.namelist():
        if filename.endswith('/'): continue
        print(f"Adding '{filename}'")
        data = zip.read(filename)
        tarinfo = tarfile.TarInfo()
        tarinfo.name = filename
        tarinfo.size = len(data)
        tarinfo.mtime = now
        tar.addfile(tarinfo, io.BytesIO(data))


if __name__ == '__main__':
    create_bundle(sys.argv[1], sys.argv[2:])
