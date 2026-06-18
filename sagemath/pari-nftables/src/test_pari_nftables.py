import ast
import hashlib
import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_NFTABLES"])

files = {path.name for path in data.iterdir() if path.is_file()}
assert files == {
    "README",
    "check",
    "T20.gp",
    "T22.gp",
    "T31.gp",
    "T33.gp",
    "T40.gp",
    "T42.gp",
    "T44.gp",
    "T51.gp",
    "T53.gp",
    "T55.gp",
    "T60.gp",
    "T62.gp",
    "T64.gp",
    "T66.gp",
    "T71.gp",
    "T73.gp",
    "T75.gp",
    "T77.gp",
}

readme = (data / "README").read_text(encoding="utf-8")
assert "number field tables" in readme
assert "T20: |disc| <   10^6,  303968 fields" in readme
assert "T77: |disc| <15*10^7,     154 fields" in readme

t20 = (data / "T20.gp").read_text(encoding="ascii").splitlines()
assert ast.literal_eval(t20[0]) == [-3, [1, -1, 1], 1, []]
assert ast.literal_eval(t20[-1]) == [-999995, [1, -1, 249999], 480, [480]]

t77 = (data / "T77.gp").read_text(encoding="ascii").splitlines()
assert ast.literal_eval(t77[0]) == [20134393, [1, -1, -6, 4, 10, -4, -4, 1], 1, []]
assert ast.literal_eval(t77[-1]) == [149324209, [1, -2, -6, 8, 11, -5, -3, 1], 1, []]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert sha256(data / "T20.gp") == "68caa202ec96a800bde92c48a4a9fff4c96b1a7d351fb3beb503e62c854bbab0"
assert sha256(data / "T77.gp") == "bdc6220d3e5d8b886ca9003e8598d8c929efd0209f759c62d91e9e73ccba2cd9"

print("pari-nftables-ok files=20 t20=%s t77=%s" % (len(t20), len(t77)))
