import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_GALDATA"])

files = {path.name for path in data.iterdir() if path.is_file()}
assert len(files) == 344
assert {"COS8_10_2", "COS10_10_4", "COS11_7_6", "RES8_10_2", "NAM8"} <= files
assert all(name.startswith(("COS", "RES", "NAM")) for name in files)


def assert_sample(name, size, prefix_hex, suffix_hex):
    payload = (data / name).read_bytes()
    assert len(payload) == size
    assert payload[:16].hex() == prefix_hex
    assert payload[-16:].hex() == suffix_hex


assert_sample(
    "COS8_10_2",
    24,
    "38203220000000003132333435363738",
    "31323334353637383132343335363837",
)
assert_sample(
    "COS11_7_6",
    27728,
    "42203235323020003132333435363738",
    "39383637353132333442413938373536",
)

print("pari-galdata-ok files=344 cos8 cos11")
