import os
from pathlib import Path


data = Path(os.environ["COWASM_COMBINATORIAL_DESIGNS_DATA"])
table = data / "MOLS_table.txt"

assert {path.name for path in data.iterdir()} == {"MOLS_table.txt"}
assert table.is_file()
assert table.stat().st_size == 31_344

text = table.read_text(encoding="ascii")
assert "Mutually Orthogonal Latin Squares" in text
payload_lines = [
    line for line in text.splitlines() if line.strip() and not line.startswith("#")
]
assert len(payload_lines) == 1

values = [int(value) for value in payload_lines[0].split(",")]
assert len(values) == 10_000
assert min(values) == 0
assert max(values) == 9_972
assert sum(values) == 6_041_938

assert values[:20] == [
    0,
    0,
    1,
    2,
    3,
    4,
    1,
    6,
    7,
    8,
    2,
    10,
    5,
    12,
    3,
    4,
    15,
    16,
    3,
    18,
]
assert values[-10:] == [30, 96, 30, 30, 30, 30, 30, 18, 15, 15]

for order in (2, 3, 4, 5, 7, 8, 9, 11, 13, 16, 17, 25, 27, 32, 49, 64, 81):
    assert values[order] == order - 1

assert values[6] == 1
assert values[10] == 2
assert values[12] == 5
assert values[100] == 8

print(
    "combinatorial-designs-ok entries=%s max=%s mols-100=%s"
    % (len(values), max(values), values[100])
)
