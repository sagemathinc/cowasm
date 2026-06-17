import os
from pathlib import Path


data = Path(os.environ["COWASM_POLYTOPES_DB_DATA"])

expected_top_level = {
    "Full2d",
    "Full3d",
    "reflexive_polytopes_2d",
    "reflexive_polytopes_3d",
}
assert expected_top_level == {path.name for path in data.iterdir()}


def read_polytope_headers(path):
    lines = path.read_text(encoding="ascii").splitlines()
    headers = []
    index = 0
    while index < len(lines):
        header = lines[index].split()
        assert len(header) == 2
        vertices, dimension = (int(header[0]), int(header[1]))
        assert vertices > dimension >= 2
        headers.append((vertices, dimension))
        for row in lines[index + 1 : index + 1 + vertices]:
            coords = [int(value) for value in row.split()]
            assert len(coords) == dimension
        index += vertices + 1
    return headers


headers_2d = read_polytope_headers(data / "reflexive_polytopes_2d")
headers_3d = read_polytope_headers(data / "reflexive_polytopes_3d")

assert len(headers_2d) == 16
assert len(headers_3d) == 4319
assert headers_2d[:3] == [(3, 2), (3, 2), (4, 2)]
assert headers_3d[:4] == [(4, 3), (4, 3), (4, 3), (5, 3)]

full2d = data / "Full2d"
full3d = data / "Full3d"
assert {path.name for path in full2d.iterdir()} == {
    "zzdb.info",
    "zzdb.v03",
    "zzdb.v04",
    "zzdb.v05",
    "zzdb.v06",
}
assert {path.name for path in full3d.iterdir()} == {
    "zzdb.info",
    "zzdb.v04",
    "zzdb.v05",
    "zzdb.v06",
    "zzdb.v07",
    "zzdb.v08",
    "zzdb.v09",
    "zzdb.v10",
    "zzdb.v11",
    "zzdb.v12",
    "zzdb.v13",
}

assert (full2d / "zzdb.info").read_text(encoding="ascii").startswith("2  4 6 3")
assert (full3d / "zzdb.info").read_text(encoding="ascii").startswith("3  10 13 10")

print(
    "polytopes-db-ok 2d=%s 3d=%s full2d-shards=%s full3d-shards=%s"
    % (
        len(headers_2d),
        len(headers_3d),
        len(list(full2d.iterdir())) - 1,
        len(list(full3d.iterdir())) - 1,
    )
)
