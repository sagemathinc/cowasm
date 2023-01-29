

# (this gets appended; not a patch)

# Make this work for building even when the install is moved.
import sys
prefix = build_time_vars['prefix']
for key, val in build_time_vars.items():
    if isinstance(val, str):
        build_time_vars[key] = val.replace(prefix, sys.prefix)


