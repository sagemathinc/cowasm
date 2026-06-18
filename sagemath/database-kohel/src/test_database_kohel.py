import bz2
import hashlib
import os
from pathlib import Path


data = Path(os.environ["COWASM_DATABASE_KOHEL_DATA"])
pol_heeg = data / "PolHeeg"
pol_mod = data / "PolMod"

assert {path.name for path in data.iterdir()} == {"PolHeeg", "PolMod"}
assert pol_heeg.is_dir()
assert pol_mod.is_dir()

dbz_files = sorted(data.rglob("*.dbz"))
assert len(dbz_files) == 5_220
assert len(list((pol_heeg / "Cls" / "0000001-0005000").glob("*.dbz"))) == 2_500
assert len(list((pol_heeg / "Cls" / "0005001-0010000").glob("*.dbz"))) == 2_500
assert len(list((pol_mod / "Cls").glob("*.dbz"))) == 44
assert len(list((pol_mod / "Atk").glob("*.dbz"))) == 51
assert len(list((pol_mod / "Eta").glob("*.dbz"))) == 50
assert len(list((pol_mod / "EtaCrr").glob("*.dbz"))) == 75


def read_dbz(relative_path):
    compressed = (data / relative_path).read_bytes()
    assert compressed.startswith(b"BZh")
    return compressed, bz2.decompress(compressed).decode("ascii")


def assert_dbz(relative_path, compressed_size, sha256, payload=None):
    compressed, decompressed = read_dbz(relative_path)
    assert len(compressed) == compressed_size
    assert hashlib.sha256(compressed).hexdigest() == sha256
    if payload is not None:
        assert decompressed == payload
    return decompressed


assert_dbz(
    "PolHeeg/Cls/0000001-0005000/pol.0000031.dbz",
    65,
    "837569f6bf9a3fb909d121ff3d778c2aacc861ae94e0cd3717c7fdaa6ccf2074",
    "1566028350940383\n-58682638134\n39491307\n1\n",
)

large_heeg = assert_dbz(
    "PolHeeg/Cls/0005001-0010000/pol.0005003.dbz",
    1_267,
    "709dbca553d3f4afc3aa279a4f0c244dd41001e0a01c79cfae73925c117b77e0",
)
assert large_heeg.endswith("\n1\n")
assert len(large_heeg.splitlines()) == 16

assert_dbz(
    "PolMod/Cls/pol.002.dbz",
    83,
    "674a19754422fbb38432c2c6e229c222f9b0de61b08d9402a7375fc937841477",
    (
        "3 0 1 \n"
        "2 2 -1 \n"
        "2 1 1488 \n"
        "2 0 -162000 \n"
        "1 1 40773375 \n"
        "1 0 8748000000 \n"
        "0 0 -157464000000000 \n"
    ),
)

assert_dbz(
    "PolMod/Eta/pol.002.dbz",
    62,
    "9dcf6bc4bde8eaaf0a21b2f32ccd5c791d791f5902cc3d30b3ebfc8371b189d3",
    "3 0 1 \n2 0 48 \n1 1 -1 \n1 0 768 \n0 0 4096 \n",
)

assert_dbz(
    "PolMod/EtaCrr/crr.02.003.dbz",
    75,
    "9df248f63d32d69ed0215b253dc7e22c24360c92148817076bfd72d71fd68aa6",
    (
        "4 0 1 \n"
        "3 3 -1 \n"
        "3 2 -72 \n"
        "3 1 -900 \n"
        "2 2 28422 \n"
        "2 1 -294912 \n"
        "1 1 -16777216 \n"
    ),
)

print("database-kohel-ok files=%s heeg=%s mod=%s" % (len(dbz_files), 5_000, 220))
