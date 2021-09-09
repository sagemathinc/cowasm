#!/usr/bin/env python
import subprocess, sys


def build(compiler):
    args = [
        "zig", compiler, "-target", "wasm32-wasi", "-D_WASI_EMULATED_SIGNAL"
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
    print(' '.join(args))
    subprocess.run(args, capture_output=True, check=True)
    if make_exe:
        file = open(make_exe, 'w')
        file.write(f"""
#!/usr/bin/env bash
wasmer run {make_exe}.wasm --dir . -- "$@"
""")
        file.close()
        subprocess.run(["chmod", "+x", make_exe],
                       capture_output=True,
                       check=True)
        # This might be nice, but it is (1) slow, (2) big, and (3) I can't
        # figure how to give it filesystem access.
        #args = ["wasmer", "create-exe", make_exe + '.wasm', "-o", make_exe]
        #print(' '.join(args))
        #print(subprocess.run(args, capture_output=True, check=True))
