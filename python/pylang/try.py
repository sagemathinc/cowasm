#!/usr/bin/env python3

import subprocess
import sys
import os
import shutil

args = sys.argv[1:]
source = None

cmd = ['bin/pylang']

while args:
    if args[0] in ('-m', '-x'):
        cmd.append(args.pop(0))
    elif args[0] == '-f':
        args.pop(0)
        source = args[0]
        cmd.append(source)
    else:
        break

raw = ' '.join(args).replace('\\n', '\n')

if os.path.exists('dev'):
    shutil.rmtree('dev')
shutil.copytree('release', 'dev')
subprocess.check_call(cmd[:1] + ['self'])
if source:
    p = subprocess.Popen(
        ['node', '--stack-trace-limit=1000'] + cmd)
else:
    p = subprocess.Popen(
        ['node', '--stack-trace-limit=1000'] + cmd, stdin=subprocess.PIPE)
    p.stdin.write(raw.encode('utf-8'))
    p.stdin.close()
try:
    raise SystemExit(p.wait())
except KeyboardInterrupt:
    p.kill()
    raise SystemExit(1)
