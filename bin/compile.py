#!/usr/bin/env python3
import subprocess, sys


def run(args):
    # print(' '.join(args)) -- don't enable except for debugging, since would obviously break scripts trying to parse output
    a = subprocess.run(args, capture_output=True, check=False)
    sys.stdout.write(a.stdout.decode('utf-8'))
    sys.stderr.write(a.stderr.decode('utf-8'))
    if a.returncode:
        sys.exit(1)


def build(compiler):
    args = [
        "zig",
        compiler,
        "-target",
        "wasm32-wasi",
        "-D_WASI_EMULATED_SIGNAL",
        "-D_WASI_EMULATED_PROCESS_CLOCKS",
    ]
    prev = None
    make_exe = False
    for x in sys.argv[1:]:
        if prev == '-o' and '-c' not in sys.argv:
            args.append(x + '.wasm')
            make_exe = x
        else:
            args.append(x)
        prev = x
    run(args)
    if make_exe:
        file = open(make_exe, 'w')
        file.write("""#!/usr/bin/env bash
wasmer run "${BASH_SOURCE[0]}.wasm" --dir . -- "$@"
""")
        file.close()
        run(["chmod", "+x", make_exe])
