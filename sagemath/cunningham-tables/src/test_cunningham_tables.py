import os
import pickletools
import zlib
from pathlib import Path


data = Path(os.environ["COWASM_CUNNINGHAM_TABLES_DATA"])
sobj = data / "cunningham_prime_factors.sobj"

assert {path.name for path in data.iterdir()} == {"cunningham_prime_factors.sobj"}
assert sobj.is_file()
assert sobj.stat().st_size == 484_967

raw = sobj.read_bytes()
assert raw.startswith(b"\x78\x9c")

payload = zlib.decompress(raw)
assert len(payload) == 883_533

values = []
seen_sage_integer_constructor = False

for opcode, argument, _position in pickletools.genops(payload):
    if opcode.name == "GLOBAL" and argument == "sage.rings.integer make_integer":
        seen_sage_integer_constructor = True
    elif opcode.name in {"SHORT_BINSTRING", "BINSTRING"}:
        values.append(argument)

assert seen_sage_integer_constructor
assert len(values) == 24_863

first_values = values[:20]
assert first_values == [
    "2",
    "3",
    "5",
    "7",
    "b",
    "d",
    "h",
    "j",
    "n",
    "t",
    "v",
    "15",
    "19",
    "1b",
    "1f",
    "1l",
    "1r",
    "1t",
    "23",
    "27",
]
assert [int(value, 32) for value in first_values] == [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    29,
    31,
    37,
    41,
    43,
    47,
    53,
    59,
    61,
    67,
    71,
]

assert values[1000:1010] == [
    "bb1",
    "bbh",
    "bd9",
    "bdl",
    "be5",
    "bej",
    "bhn",
    "bhp",
    "bkt",
    "bl5",
]
assert max(len(value) for value in values) == 299

print(
    "cunningham-tables-ok factors=%s first=%s max-digits=%s"
    % (len(values), first_values[0], max(len(value) for value in values))
)
