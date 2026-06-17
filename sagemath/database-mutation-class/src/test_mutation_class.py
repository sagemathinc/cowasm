import os
import pickle
from pathlib import Path


data = Path(os.environ["COWASM_MUTATION_CLASS_DATA"])

expected = {
    "mutation_classes_10.dig6": (189_466, 1, 5_739),
    "mutation_classes_2.dig6": (94, 1, 2),
    "mutation_classes_3.dig6": (578, 2, 12),
    "mutation_classes_4.dig6": (1_574, 4, 26),
    "mutation_classes_5.dig6": (6_686, 2, 120),
    "mutation_classes_6.dig6": (12_961, 5, 232),
    "mutation_classes_7.dig6": (13_283, 3, 550),
    "mutation_classes_8.dig6": (72_242, 3, 2_703),
    "mutation_classes_9.dig6": (241_733, 2, 8_066),
}

assert {path.name for path in data.iterdir()} == set(expected)

total_classes = 0
total_representatives = 0
for name, (size, class_count, representative_count) in expected.items():
    path = data / name
    assert path.is_file()
    assert path.stat().st_size == size

    with path.open("rb") as handle:
        classes = pickle.load(handle, encoding="bytes")

    assert len(classes) == class_count
    assert all(isinstance(key, tuple) and isinstance(value, list) for key, value in classes.items())
    assert sum(len(value) for value in classes.values()) == representative_count
    total_classes += len(classes)
    total_representatives += representative_count

assert total_classes == 23
assert total_representatives == 17_450

print(
    "mutation-class-ok files=%s classes=%s representatives=%s"
    % (len(expected), total_classes, total_representatives)
)
