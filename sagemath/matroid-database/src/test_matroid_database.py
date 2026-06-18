from matroid_database import (
    all_matroids_bases,
    all_matroids_revlex,
    unorientable_matroids_bases,
    unorientable_matroids_revlex,
)


assert list(all_matroids_revlex(2, 1)) == ["**", "0*"]
assert list(all_matroids_bases(2, 1)) == [[(0,), (1,)], [(1,)]]
assert list(all_matroids_revlex(2, 2)) == ["*"]
assert list(all_matroids_bases(2, 2)) == [[(0, 1)]]

rank_two_counts = [sum(1 for _ in all_matroids_revlex(n, 2)) for n in range(2, 8)]
assert rank_two_counts == [1, 3, 7, 13, 23, 37]

rank_three_counts = [sum(1 for _ in all_matroids_revlex(n, 3)) for n in range(3, 8)]
assert rank_three_counts == [1, 4, 13, 38, 108]

assert list(unorientable_matroids_revlex(7, 3)) == ["0******0******0***0******0*0**0****"]
assert list(unorientable_matroids_bases(7, 3)) == [
    [
        (0, 1, 3),
        (0, 2, 3),
        (1, 2, 3),
        (0, 1, 4),
        (0, 2, 4),
        (1, 2, 4),
        (1, 3, 4),
        (2, 3, 4),
        (0, 1, 5),
        (0, 2, 5),
        (1, 2, 5),
        (0, 3, 5),
        (2, 3, 5),
        (0, 4, 5),
        (1, 4, 5),
        (3, 4, 5),
        (0, 1, 6),
        (0, 2, 6),
        (1, 2, 6),
        (0, 3, 6),
        (1, 3, 6),
        (0, 4, 6),
        (2, 4, 6),
        (3, 4, 6),
        (1, 5, 6),
        (2, 5, 6),
        (3, 5, 6),
        (4, 5, 6),
    ]
]

try:
    list(all_matroids_revlex(10, 5))
except ValueError as err:
    assert "allr5n10.txt.xz" in str(err)
    assert "Available (n, r)" in str(err)
else:
    raise AssertionError("missing matroid data unexpectedly opened")

print("matroid-database-ok all-ranks unorientable missing-data")
