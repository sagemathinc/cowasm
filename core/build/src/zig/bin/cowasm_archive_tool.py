#!/usr/bin/env -S python3 -E

import os
import pathlib
import shutil
import subprocess
import sys

SUPPORTED_TOOLCHAINS = {"zig", "clang", "wasi-sdk"}
ORIGINAL_ARGV0 = sys.argv[0]


def fail(message, exit_code=2):
    print(message, file=sys.stderr)
    sys.exit(exit_code)


def selected_toolchain():
    toolchain = os.environ.get("COWASM_TOOLCHAIN", "zig").strip().lower()
    if toolchain == "":
        return "zig"
    return toolchain


def archive_tool():
    name = pathlib.Path(ORIGINAL_ARGV0).name
    if name.endswith("cowasm-ar"):
        return "ar"
    if name.endswith("cowasm-ranlib"):
        return "ranlib"
    fail(f"cowasm: cannot infer archive tool mode from {ORIGINAL_ARGV0!r}")


def find_zig():
    zig = shutil.which("zig")
    if zig:
        return os.path.realpath(zig)

    invocation_dir = pathlib.Path(ORIGINAL_ARGV0).parent
    sibling = invocation_dir / "zig"
    if sibling.is_file() and os.access(sibling, os.X_OK):
        return os.path.realpath(sibling)

    fail(
        "cowasm: could not find 'zig'; run make -C core/build zig or add "
        "the CoWasm bin directory to PATH"
    )


def find_required_program(env_name, program, toolchain):
    override = os.environ.get(env_name)
    if override:
        path = pathlib.Path(override)
        if path.is_file() and os.access(path, os.X_OK):
            return str(path)
        fail(f"cowasm: {env_name}={override!r} is not an executable file")

    found = shutil.which(program)
    if found:
        # Preserve the driver name.  LLVM archive tools can be symlinked
        # through generic binaries whose behavior depends on argv[0].
        return found

    sibling = pathlib.Path(ORIGINAL_ARGV0).parent / program
    if sibling.is_file() and os.access(sibling, os.X_OK):
        return str(sibling)

    fail(
        f"cowasm: COWASM_TOOLCHAIN={toolchain} requires '{program}'; "
        f"install it or set {env_name}=/path/to/{program}"
    )


def command_for(toolchain, tool):
    if toolchain == "zig":
        return [find_zig(), tool]
    if toolchain == "clang":
        if tool == "ar":
            return [find_required_program("COWASM_AR", "llvm-ar", toolchain)]
        return [find_required_program("COWASM_RANLIB", "llvm-ranlib", toolchain)]
    if tool == "ar":
        return [
            find_required_program(
                "COWASM_AR", "wasi-sdk-llvm-ar-next", toolchain)
        ]
    return [
        find_required_program(
            "COWASM_RANLIB", "wasi-sdk-llvm-ranlib-next", toolchain)
    ]


def main():
    toolchain = selected_toolchain()
    if toolchain not in SUPPORTED_TOOLCHAINS:
        fail(
            f"cowasm: unsupported COWASM_TOOLCHAIN={toolchain!r}; "
            "supported values are 'zig', 'clang', and 'wasi-sdk'."
        )

    cmd = command_for(toolchain, archive_tool()) + sys.argv[1:]
    ret = subprocess.run(cmd)
    sys.exit(ret.returncode)


if __name__ == "__main__":
    main()
