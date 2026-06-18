import ast
import os
from pathlib import Path


data = Path(os.environ["COWASM_PARI_GALDATA"])

files = {path.name for path in data.iterdir() if path.is_file()}
assert len(files) == 344
assert {"COS8_10_2", "COS10_10_4", "COS11_7_6", "RES8_10_2", "NAM8"} <= files
assert all(name.startswith(("COS", "RES", "NAM")) for name in files)
assert sum(1 for name in files if name.startswith("COS")) == 197
assert sum(1 for name in files if name.startswith("RES")) == 143
assert sum(1 for name in files if name.startswith("NAM")) == 4


def read_names(name):
    return ast.literal_eval((data / name).read_text(encoding="ascii"))


names8 = read_names("NAM8")
names9 = read_names("NAM9")
names10 = read_names("NAM10")
names11 = read_names("NAM11")

assert len(names8) == 50
assert len(names9) == 34
assert len(names10) == 45
assert len(names11) == 8
assert names8[:5] == [
    "C(8)=8",
    "4[x]2",
    "E(8)=2[x]2[x]2",
    "D_8(8)=[4]2",
    "Q_8(8)",
]
assert names8[-3:] == ["E(8):L_7=AL(8)", "A8", "S8"]
assert names9[:3] == ["C(9)=9", "E(9)=3[x]3", "D(9)=9:2"]
assert names9[-3:] == ["L(9):3=P|L(2,8)", "A9", "S9"]
assert names10[:3] == ["C(10)=5[x]2", "D(10)=5:2", "D_10(10)=[D(5)]2"]
assert names10[-3:] == ["[S(5)^2]2", "A10", "S10"]
assert names11 == [
    "C(11)=11",
    "D(11)=11:2",
    "F_55(11)=11:5",
    "F_110(11)=11:10",
    "L(11)=PSL(2,11)(11)",
    "M(11)",
    "A11",
    "S11",
]


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
assert_sample(
    "RES8_10_2",
    24,
    "38200000003220003638323831333234",
    "36383238313332343335343635373137",
)
assert_sample(
    "RES10_35_30",
    2168,
    "33363020003620003638383941413333",
    "34343538313134363838323335353737",
)
assert_sample(
    "RES11_7_6",
    338,
    "36362000003520003738394142343637",
    "42313233363731323335393132333438",
)

print(
    "pari-galdata-ok files=344 cos=197 res=143 nam=4 "
    "cos8 cos11 res10 res11"
)
