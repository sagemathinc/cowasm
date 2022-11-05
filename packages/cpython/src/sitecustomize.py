# Revert strange change to Python: https://discuss.python.org/t/int-str-conversions-broken-in-latest-python-bugfix-releases/18889
# This was a (potential) security issue for webservers, which isn't relevant for python-wasm.
import sys
sys.set_int_max_str_digits(0)

try:
    import cowasm_importer
except:
    pass