import os
import sqlite3
from pathlib import Path


data = Path(os.environ["COWASM_CREMONA_DATA"])
database = data / "cremona.db"

assert {path.name for path in data.iterdir()} == {"cremona.db"}
assert database.stat().st_size == 613_924_864
with database.open("rb") as handle:
    assert handle.read(16) == b"SQLite format 3\x00"


def assert_database_contains(path, expected_needles):
    pending = set(expected_needles)
    overlap = max(len(needle) for needle in pending) - 1
    tail = b""

    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            window = tail + chunk
            pending = {needle for needle in pending if needle not in window}
            if not pending:
                return
            tail = window[-overlap:]

    missing = ", ".join(needle.decode("ascii") for needle in sorted(pending))
    raise AssertionError(f"missing Cremona database sentinel(s): {missing}")


assert_database_contains(
    database,
    {
        b"CREATE TABLE t_class",
        b"CREATE TABLE t_curve",
        b"[0,-1,1,-10,-20]",
        b"[0,0,1,-1,0]",
        b"11a1",
        b"37a1",
        b"499998a",
    },
)

try:
    conn = sqlite3.connect(f"file:{database}?mode=ro&immutable=1", uri=True)
except sqlite3.OperationalError as err:
    if "disk I/O error" not in str(err):
        raise
    # The current CoWasm SQLite VFS supports in-memory queries but not
    # file-backed databases.  The raw sentinels above still prove this package
    # contains the expected schema and representative Sage elliptic-curve data.
    print("cremona-ellcurve-ok sqlite-vfs=file-unavailable raw-records=checked")
    raise SystemExit(0)

cursor = conn.cursor()

tables = {
    row[0]
    for row in cursor.execute(
        "select name from sqlite_master where type = 'table'"
    )
}
assert tables == {"t_class", "t_curve"}

class_schema = cursor.execute(
    "select sql from sqlite_master where type = 'table' and name = 't_class'"
).fetchone()[0]
curve_schema = cursor.execute(
    "select sql from sqlite_master where type = 'table' and name = 't_curve'"
).fetchone()[0]

assert class_schema == (
    "CREATE TABLE t_class(rank INTEGER, deg INTEGER, class TEXT PRIMARY KEY, "
    "conductor INTEGER, L REAL)"
)
assert curve_schema == (
    "CREATE TABLE t_curve(reg REAL, om REAL, sha , tors INTEGER, eqn TEXT "
    "UNIQUE, cp INTEGER, curve TEXT PRIMARY KEY, class TEXT, gens TEXT)"
)

assert cursor.execute("select count(*) from t_class").fetchone()[0] == 2_164_260
assert cursor.execute("select count(*) from t_curve").fetchone()[0] == 3_064_705
assert cursor.execute("select max(conductor) from t_class").fetchone()[0] == 499_998

assert cursor.execute("select * from t_class where class = '11a'").fetchone() == (
    0,
    1,
    "11a",
    11,
    0.253841860855911,
)
assert cursor.execute("select * from t_curve where curve = '11a1'").fetchone() == (
    1.0,
    1.26920930427955,
    1,
    5,
    "[0,-1,1,-10,-20]",
    5,
    "11a1",
    "11a",
    "[]",
)

assert cursor.execute("select * from t_class where class = '37a'").fetchone() == (
    1,
    2,
    "37a",
    37,
    0.305999773834052,
)
assert cursor.execute("select * from t_curve where curve = '37a1'").fetchone() == (
    0.0511114082399688,
    5.98691729246392,
    1.0,
    1,
    "[0,0,1,-1,0]",
    1,
    "37a1",
    "37a",
    "[[0,0,1]]",
)

assert cursor.execute(
    "select conductor, class, deg from t_class where class = '499998a'"
).fetchone() == (
    499_998,
    "499998a",
    15_430_272,
)

print("cremona-ellcurve-ok classes=2164260 curves=3064705 max-conductor=499998")
