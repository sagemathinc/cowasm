import ast
import hashlib
import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_SEADATA"])

files = {path.name for path in data.iterdir() if path.is_file()}
sea_files = {name for name in files if name.startswith("sea")}
sea_numbers = sorted(int(name[3:]) for name in sea_files)

assert "README" in files
assert len(files) == 52
assert sea_numbers[:2] == [0, 2]
assert sea_numbers[-1] == 499
assert all(number == 2 or number == 0 or number >= 211 for number in sea_numbers)

readme = (data / "README").read_text(encoding="utf-8")
assert "Modular polynomials for PARI/GP" in readme
assert "p < 500" in readme

sea0 = (data / "sea0").read_text(encoding="ascii").splitlines()
assert len(sea0) == 45
assert ast.literal_eval(sea0[0]) == [3, "C", [1, 36, 270, [-1, 756], 729]]
assert ast.literal_eval(sea0[1])[:3] == [5, "C", [1, 30, 315, 1300, 1575, [-1, 750], 125]]

sea2 = (data / "sea2").read_text(encoding="ascii")
assert ast.literal_eval(sea2) == [2, "C", [1, 48, [-1, 768], 4096]]

sea211_first = ast.literal_eval((data / "sea211").read_text(encoding="ascii").splitlines()[0])
assert sea211_first[0:2] == [211, "A"]
assert len(sea211_first[2]) == 213

sea499 = data / "sea499"
assert sea499.stat().st_size == 2_621_399
assert hashlib.sha256(sea499.read_bytes()).hexdigest() == (
    "b024b8f65dcf8deaf0aae5cbebf8b8659204dfca78524c6dac9855165cc920b3"
)

print("pari-seadata-ok files=%s sea0-lines=%s max-prime=%s" % (len(files), len(sea0), sea_numbers[-1]))
