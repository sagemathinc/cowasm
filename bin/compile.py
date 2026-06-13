#!/usr/bin/env python-native
import os, pathlib, shutil, subprocess, sys

RUN = "wasi-js"
SUPPORTED_TOOLCHAINS = {"zig"}

SCRIPT_DIR = r"""SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"""


def selected_toolchain():
    toolchain = os.environ.get("COWASM_TOOLCHAIN", "zig").strip().lower()
    if toolchain == "":
        return "zig"
    return toolchain


def find_zig():
    zig = shutil.which("zig")
    if zig:
        return os.path.realpath(zig)

    sibling = pathlib.Path(__file__).resolve().parent / "zig"
    if sibling.is_file() and os.access(sibling, os.X_OK):
        return os.path.realpath(sibling)

    print(
        "cowasm: could not find 'zig'; run make -C core/build zig or add "
        "the CoWasm bin directory to PATH",
        file=sys.stderr,
    )
    sys.exit(2)


def run(args):
    # print(' '.join(args)) -- don't enable except for debugging, since would obviously break scripts trying to parse output
    a = subprocess.run(args, capture_output=True, check=False)
    sys.stdout.write(a.stdout.decode('utf-8'))
    sys.stderr.write(a.stderr.decode('utf-8'))
    if a.returncode:
        sys.exit(1)


def build(compiler):
    toolchain = selected_toolchain()
    if toolchain not in SUPPORTED_TOOLCHAINS:
        print(
            f"cowasm: unsupported COWASM_TOOLCHAIN={toolchain!r}; "
            "only 'zig' is implemented. The direct clang/lld backend is not ready yet.",
            file=sys.stderr,
        )
        sys.exit(2)

    args = [
        find_zig(),
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
