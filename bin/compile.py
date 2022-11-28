#!/usr/bin/env python-native
import os, subprocess, sys

RUN = "npx --yes wasi-js"

SCRIPT_DIR = r"""SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"""


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
    wasm_file = '"${BASH_SOURCE[0]}.wasm"'
    for x in sys.argv[1:]:
        if prev == '-o' and '-c' not in sys.argv:
            args.append(x + '.wasm')
            wasm_file = x + '.wasm'
            make_exe = x
        else:
            args.append(x)
        prev = x
    if not make_exe and '-c' not in sys.argv:
        # E.g., zcc foo.c produces a.out always.
        make_exe = "a.out"
        args.append("-o")
        args.append("a.out.wasm")
        wasm_file = 'a.out.wasm'
    run(args)
    if make_exe:
        file = open(make_exe, 'w')
        file.write('#!/usr/bin/env bash\n' + SCRIPT_DIR + '\n' + RUN +
                   ' "${SCRIPT_DIR}/' + wasm_file + '" "$@"')
        file.close()
        run(["chmod", "+x", make_exe])
