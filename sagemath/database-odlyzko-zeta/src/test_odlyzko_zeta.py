import os
from pathlib import Path


data = Path(os.environ["COWASM_ODLYZKO_ZETA_DATA"])
zeros = data / "zeros6"

assert zeros.is_file()
assert zeros.stat().st_size > 20_000_000

count = 0
first = []
last = []
previous = 0.0

with zeros.open(encoding="ascii") as handle:
    for line in handle:
        value = float(line)
        assert value > previous
        previous = value
        count += 1

        if len(first) < 8:
            first.append(value)
        last.append(value)
        if len(last) > 5:
            last.pop(0)

assert count == 2_001_052
assert first == [
    14.134725142,
    21.022039639,
    25.01085758,
    30.424876126,
    32.935061588,
    37.586178159,
    40.918719012,
    43.327073281,
]
assert last == [
    1132488.90532808,
    1132489.162779754,
    1132489.585214591,
    1132490.165304883,
    1132490.658714411,
]

print("odlyzko-zeta-ok zeros=%s first=%.9f last=%.9f" % (count, first[0], last[-1]))
