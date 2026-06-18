import ast
import os
from fractions import Fraction
from pathlib import Path


data = Path(os.environ["COWASM_PARI_ELLDATA"])

expected_files = {"README"} | {f"ell{i}" for i in range(400)}
assert expected_files == {path.name for path in data.iterdir()}

readme = (data / "README").read_text(encoding="utf-8")
assert "J. E. Cremona Elliptic Curve Data" in readme
assert "conductor less than 400000" in readme


def eval_pari_data(path):
    tree = ast.parse(path.read_text(encoding="ascii"), mode="eval")
    return eval_node(tree.body)


def eval_node(node):
    if isinstance(node, ast.List):
        return [eval_node(elt) for elt in node.elts]
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, str)):
            return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        value = eval_node(node.operand)
        if isinstance(value, int):
            return -value
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
        numerator = eval_node(node.left)
        denominator = eval_node(node.right)
        if isinstance(numerator, int) and isinstance(denominator, int):
            return Fraction(numerator, denominator)
    raise AssertionError(f"unsupported PARI elldata syntax: {ast.dump(node)}")


def by_conductor(records):
    return {entry[0]: entry[1:] for entry in records}


def curve(records_by_conductor, conductor, label):
    for entry in records_by_conductor[conductor]:
        if entry[0] == label:
            return entry
    raise AssertionError(f"missing curve {label}")


ell0 = by_conductor(eval_pari_data(data / "ell0"))
assert set(ell0) >= {11, 37, 507, 990}
assert curve(ell0, 11, "11a1") == ["11a1", [0, -1, 1, -10, -20], []]
assert curve(ell0, 37, "37a1") == ["37a1", [0, 0, 1, -1, 0], [[0, 0]]]
assert curve(ell0, 507, "507a2") == [
    "507a2",
    [1, 1, 0, -12678, -3060351],
    [[Fraction(6144, 25), Fraction(354243, 125)]],
]
assert curve(ell0, 990, "990l2") == ["990l2", [1, -1, 1, 2668, -45961], []]

ell399 = by_conductor(eval_pari_data(data / "ell399"))
assert min(ell399) == 399003
assert max(ell399) == 399998
assert curve(ell399, 399950, "399950a1") == [
    "399950a1",
    [1, 0, 1, -96, 338],
    [[2, 11], [7, 1]],
]
assert curve(ell399, 399998, "399998a1") == [
    "399998a1",
    [1, -1, 1, -45, 141],
    [[5, 2]],
]

print(
    "pari-elldata-ok files=%s ell0-conductors=%s ell399-conductors=%s"
    % (len(expected_files), len(ell0), len(ell399))
)
