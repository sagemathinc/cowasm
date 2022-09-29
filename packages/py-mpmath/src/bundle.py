import os, sys, zipfile


def create_bundle(name):

    def notests(s):
        fn = os.path.basename(s)
        return (not ('/tests/' in s or fn.startswith('test_')))

    # Python stdlib uses the same options as below, and it's easiest
    # to work with these params using possibly older versions of zip.
    # NOTE: compression=zipfile.ZIP_LZMA is a bit smaller, but fails on import, probably
    # due to a subtle issue with webassembly.  We will revisit this later.

    with zipfile.PyZipFile(f'{name}.zip',
                           'w',
                           optimize=2,
                           compression=zipfile.ZIP_DEFLATED) as pzf:
        pzf.compresslevel = 9
        pzf.writepy(name, filterfunc=notests)


if __name__ == '__main__':
    create_bundle(sys.argv[1])
