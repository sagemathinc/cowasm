import ast
import bz2
import os
from pathlib import Path


data = Path(os.environ["COWASM_STEIN_WATKINS_DATA"])

assert {path.name for path in data.iterdir()} == {
    "a.000.bz2",
    "a.001.bz2",
    "p.00.bz2",
}

expected_compressed_sizes = {
    "a.000.bz2": 7_779_861,
    "a.001.bz2": 7_190_726,
    "p.00.bz2": 5_057_001,
}
expected_line_counts = {
    "a.000.bz2": 868_034,
    "a.001.bz2": 760_376,
    "p.00.bz2": 623_997,
}

for name, size in expected_compressed_sizes.items():
    assert (data / name).is_file()
    assert (data / name).stat().st_size == size


def parse_curve(line):
    ainvs, conductor_data, rank, torsion = line.split(maxsplit=3)
    return {
        "ainvs": ast.literal_eval(ainvs),
        "conductor_data": conductor_data,
        "rank": rank,
        "torsion": torsion,
    }


def parse_header(line):
    conductor, factors, rank, leading, isogeny_number, modular_degree = line.split()
    return {
        "conductor": int(conductor),
        "factors": factors,
        "rank": int(rank),
        "leading_coefficient": leading,
        "isogeny_number": isogeny_number,
        "modular_degree": modular_degree,
    }


def iter_classes(name):
    current = None
    with bz2.open(data / name, "rt", encoding="ascii") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            if not line.startswith("["):
                if current is not None:
                    yield current
                current = parse_header(line)
                current["curves"] = []
            else:
                current["curves"].append(parse_curve(line))
    if current is not None:
        yield current


def count_lines(name):
    with bz2.open(data / name, "rt", encoding="ascii") as handle:
        return sum(1 for _ in handle)


for name, count in expected_line_counts.items():
    assert count_lines(name) == count

all0 = iter_classes("a.000.bz2")
first_all0 = next(all0)
assert first_all0 == {
    "conductor": 11,
    "factors": "[11]",
    "rank": 0,
    "leading_coefficient": "0.253842",
    "isogeny_number": "25",
    "modular_degree": "+*1",
    "curves": [
        {
            "ainvs": [0, -1, 1, 0, 0],
            "conductor_data": "(1)",
            "rank": "1",
            "torsion": "5",
        },
        {
            "ainvs": [0, -1, 1, -10, -20],
            "conductor_data": "(5)",
            "rank": "1",
            "torsion": "5",
        },
        {
            "ainvs": [0, -1, 1, -7820, -263580],
            "conductor_data": "(1)",
            "rank": "1",
            "torsion": "1",
        },
    ],
}

all0_by_conductor = {}
for curve_class in iter_classes("a.000.bz2"):
    all0_by_conductor.setdefault(curve_class["conductor"], []).append(curve_class)
    if curve_class["conductor"] > 37:
        break

assert [curve_class["rank"] for curve_class in all0_by_conductor[37]] == [1, 0]
assert all0_by_conductor[37][0]["curves"][0]["ainvs"] == [0, 0, 1, -1, 0]

all1_first = next(iter_classes("a.001.bz2"))
assert all1_first["conductor"] == 100_002
assert all1_first["rank"] == 1
assert [curve["ainvs"] for curve in all1_first["curves"]] == [
    [1, 1, 0, 112, 0],
    [1, 1, 0, -448, -560],
]

prime0 = iter_classes("p.00.bz2")
prime_conductors = [next(prime0)["conductor"] for _ in range(3)]
assert prime_conductors == [11, 17, 19]

print(
    "stein-watkins-mini-ok all0=%s all1=%s prime0=%s"
    % (
        expected_line_counts["a.000.bz2"],
        expected_line_counts["a.001.bz2"],
        expected_line_counts["p.00.bz2"],
    )
)
