# Install our custom import hook, which imports tar.xz bundles with so in them.
import cowasm_importer

# Revert strange change to Python: https://discuss.python.org/t/int-str-conversions-broken-in-latest-python-bugfix-releases/18889
# This was a (potential) security issue for webservers, which isn't relevant for python-wasm.
import sys
sys.set_int_max_str_digits(0)

# This is very convenient in the context of WASM, where security constraints are different.
sys.path.append('.')

