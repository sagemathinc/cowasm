import collections
import hashlib
import os
import pickletools
import zlib
from pathlib import Path


data = Path(os.environ["COWASM_JONES_NUMFIELD_DATA"])
jones = data / "jones.sobj"

assert {path.name for path in data.iterdir()} == {"jones.sobj"}
assert jones.is_file()

compressed = jones.read_bytes()
assert len(compressed) == 184_466
assert hashlib.sha256(compressed).hexdigest() == (
    "1e00806dbbc99ff5da86f8d21d75bab14e4b00a85eebc70ea0d9c64be72dfc38"
)

raw = zlib.decompress(compressed)
assert len(raw) == 670_759
assert raw.startswith(b"\x80\x02}q\x01")

op_counts = collections.Counter()
global_refs = collections.Counter()
last_opcode = None
last_pos = None
for opcode, argument, pos in pickletools.genops(raw):
    op_counts[opcode.name] += 1
    if opcode.name == "GLOBAL":
        global_refs[argument] += 1
    last_opcode = opcode.name
    last_pos = pos

assert last_opcode == "STOP"
assert last_pos == len(raw) - 1
assert op_counts["TUPLE2"] == 300
assert op_counts["EMPTY_LIST"] == 7_795
assert op_counts["SETITEMS"] == 2
assert global_refs == {
    "sage.rings.polynomial.polynomial_element_generic Polynomial_rational_dense": 1,
    "sage.rings.polynomial.polynomial_ring_constructor PolynomialRing": 1,
    "sage.rings.rational_field RationalField": 1,
    "sage.rings.rational make_rational": 1,
}

print("jones-numfield-ok compressed=%s raw=%s" % (len(compressed), len(raw)))
