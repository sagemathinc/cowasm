import hashlib
import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_GALPOL"])

files = [path for path in data.rglob("*") if path.is_file()]
assert len(files) == 14681

degree_dirs = sorted(
    int(path.name) for path in data.iterdir() if path.is_dir() and path.name.isdigit()
)
assert len(degree_dirs) == 143
assert degree_dirs[:3] == [1, 2, 3]
assert degree_dirs[-3:] == [141, 142, 143]

by_name = {}
for path in files:
    by_name[path.name] = by_name.get(path.name, 0) + 1
assert by_name["name"] == 3657
assert by_name["group"] == 3657
assert by_name["real"] == 3657
assert by_name["complex"] == 3537
assert by_name["nb"] == 143

assert (data / "2" / "1" / "name").read_text(encoding="ascii") == '"C2"\n'
assert (
    (data / "2" / "1" / "group").read_text(encoding="ascii")
    == "[[Vecsmall([2,1])],Vecsmall([2])]\n"
)
assert (data / "2" / "1" / "real").read_text(encoding="ascii") == "[Pol([1,-1,-1]),1]\n"
assert (data / "80" / "43" / "name").read_text(encoding="ascii") == '"C2 x C2 x (C5 : C4)"\n'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert sha256(data / "80" / "43" / "group") == (
    "d09b21c0e8b1ec8a10a604ae451e211cb5fe8640ea72c8b892a7ae0c0a58d9cf"
)
assert sha256(data / "80" / "43" / "real") == (
    "5b57c1092066f25744a324b5c58241dce2d7288ca9bfc60e554d7ecbeab41037"
)
assert sha256(data / "80" / "43" / "complex") == (
    "a7277418badd1e1c37f8bff9abd31747e53e2015ea25c657acf26e2b383b3bc0"
)

print("pari-galpol-ok files=14681 degrees=143 groups=3657")
