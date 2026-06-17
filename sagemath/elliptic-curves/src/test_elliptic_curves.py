import ast
import os
from pathlib import Path


data = Path(os.environ["COWASM_ELLIPTIC_CURVES_DATA"])
common = data / "common"
ellcurves = data / "ellcurves"

assert {path.name for path in data.iterdir()} == {"common", "ellcurves"}
assert {path.name for path in common.iterdir()} == {"allcurves.00000-09999"}

rank_files = {path.name for path in ellcurves.iterdir()}
assert rank_files == {
    "rank10",
    "rank11",
    "rank12",
    "rank14",
    "rank15",
    "rank17",
    "rank19",
    "rank20",
    "rank21",
    "rank22",
    "rank23",
    "rank24",
    "rank28",
    "rank3",
    "rank4",
    "rank5",
    "rank6",
    "rank7",
    "rank8",
    "rank9",
}


def parse_curve_line(line):
    conductor, iso_class, number, ainvs, rank, torsion = line.split(maxsplit=5)
    return {
        "conductor": int(conductor),
        "iso_class": iso_class,
        "number": int(number),
        "ainvs": ast.literal_eval(ainvs),
        "rank": int(rank),
        "torsion": int(torsion),
    }


allcurves = common / "allcurves.00000-09999"
lines = allcurves.read_text(encoding="ascii").splitlines()
assert len(lines) == 64687
assert allcurves.stat().st_size > 2_000_000

first = parse_curve_line(lines[0])
assert first == {
    "conductor": 11,
    "iso_class": "a",
    "number": 1,
    "ainvs": [0, -1, 1, -10, -20],
    "rank": 0,
    "torsion": 5,
}
assert any(
    parse_curve_line(line)["conductor"] == 37
    and parse_curve_line(line)["rank"] == 1
    for line in lines
)

rank3_lines = (ellcurves / "rank3").read_text(encoding="ascii").splitlines()
assert len(rank3_lines) == 835
assert parse_curve_line(rank3_lines[0])["rank"] == 3

rank28 = parse_curve_line((ellcurves / "rank28").read_text(encoding="ascii"))
assert rank28["rank"] == 28
assert len(str(rank28["conductor"])) > 100
assert len(rank28["ainvs"]) == 5

print(
    "elliptic-curves-ok cremona-mini=%s rank-files=%s rank3=%s"
    % (len(lines), len(rank_files), len(rank3_lines))
)
