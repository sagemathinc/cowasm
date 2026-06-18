import ast
import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_SEADATA"])

files = {path.name for path in data.iterdir() if path.is_file()}
assert files == {"README", "sea0", "sea2"}

readme = (data / "README").read_text(encoding="utf-8")
assert "Modular polynomials for PARI/GP" in readme
assert "p < 500" in readme

sea0 = (data / "sea0").read_text(encoding="ascii").splitlines()
assert len(sea0) == 45
assert ast.literal_eval(sea0[0]) == [3, "C", [1, 36, 270, [-1, 756], 729]]
assert ast.literal_eval(sea0[1])[:3] == [5, "C", [1, 30, 315, 1300, 1575, [-1, 750], 125]]

sea2 = (data / "sea2").read_text(encoding="ascii")
assert ast.literal_eval(sea2) == [2, "C", [1, 48, [-1, 768], 4096]]

print("pari-seadata-small-ok files=3 sea0-lines=%s sea2" % len(sea0))
