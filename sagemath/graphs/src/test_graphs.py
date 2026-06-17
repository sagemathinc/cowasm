import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path


data = Path(os.environ["COWASM_GRAPHS_DATA"])

expected_files = {
    "graphs.db",
    "brouwer_srg_database.json",
    "smallgraphs.txt",
    "isgci_sage.xml",
}

assert expected_files == {path.name for path in data.iterdir()}

graph_db = (data / "graphs.db").read_bytes()
assert graph_db.startswith(b"SQLite format 3\x00")
assert len(graph_db) > 1_000_000
for table in (b"graph_data", b"degrees", b"spectrum", b"aut_grp", b"misc"):
    assert table in graph_db

with open(data / "brouwer_srg_database.json", encoding="utf-8") as handle:
    strongly_regular_graphs = json.load(handle)

assert strongly_regular_graphs[0][:5] == [5, 2, 0, 1, "exists"]
assert any(row[:4] == [10, 3, 0, 1] for row in strongly_regular_graphs)

smallgraphs = (data / "smallgraphs.txt").read_text(encoding="utf-8")
assert "P_3\tBg" in smallgraphs
assert "triangle\tBw" in smallgraphs

tree = ET.parse(data / "isgci_sage.xml")
root = tree.getroot()
assert root.tag == "ISGCI"
assert root.find("./stats").attrib["nodes"] == "1461"

print(
    "graphs-ok files=4 sqlite-bytes=%s srg-rows=%s"
    % (len(graph_db), len(strongly_regular_graphs))
)
