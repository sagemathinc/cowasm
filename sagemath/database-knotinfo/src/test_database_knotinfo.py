import os

import database_knotinfo
from database_knotinfo import link_list, version


assert version() == "2026.6.1"

package_path = database_knotinfo.__path__[0]
csv_path = os.path.join(package_path, "csv_data")
knot_csv = os.path.join(csv_path, "knotinfo_data_complete.csv")
link_csv = os.path.join(csv_path, "linkinfo_data_complete.csv")

assert os.path.isfile(knot_csv)
assert os.path.isfile(link_csv)
assert os.path.getsize(knot_csv) > 10_000_000
assert os.path.getsize(link_csv) > 1_000_000

knots = link_list()
links = link_list(proper_links=True)

assert len(knots) == 12967
assert len(links) == 4189

trefoil = knots[2]
assert trefoil["name"] == "3_1"
assert trefoil["crossing_number"] == "3"
assert trefoil["braid_index"] == "2"
assert trefoil["homfly_polynomial"] == "(2*v^2-v^4)+ v^2*z^2"

figure_eight = knots[3]
assert figure_eight["name"] == "4_1"
assert figure_eight["fibered"] == "Y"
assert figure_eight["volume"] == "2.0298832128"

hopf_link = links[2]
assert hopf_link["name"] == "L2a1{1}"
assert hopf_link["braid_notation"] == "{2, {1, 1}}"
assert hopf_link["homflypt_polynomial"] == "v/z-v^3/z + v*z"

print(
    "database-knotinfo-ok version=2026.6.1 knots=12967 links=4189 "
    "trefoil braid=2 figure-eight volume=2.0298832128 hopf"
)
