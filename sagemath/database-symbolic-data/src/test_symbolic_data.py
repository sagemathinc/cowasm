import os
import xml.etree.ElementTree as ET
from pathlib import Path


data = Path(os.environ["COWASM_SYMBOLIC_DATA"])
xml_resources = data / "XMLResources"

assert {path.name for path in data.iterdir()} == {"XMLResources"}
assert xml_resources.is_dir()

top_level = {path.name for path in xml_resources.iterdir()}
assert top_level == {
    "Common.xsd",
    "GenPS",
    "GeneralPolynomialSystem.xsd",
    "GeoCode.xml",
    "GeoCode.xsd",
    "INTPS",
    "IntegerPolynomialSystem.xsd",
}

xml_files = sorted(xml_resources.rglob("*.xml"))
xsd_files = sorted(xml_resources.glob("*.xsd"))
assert len(xml_files) == 373
assert len(xsd_files) == 4
assert len(list((xml_resources / "INTPS").glob("*.xml"))) == 349
assert len(list((xml_resources / "GenPS").glob("*.xml"))) == 23


def parse_xml(relative_path):
    return ET.parse(xml_resources / relative_path).getroot()


katsura = parse_xml("INTPS/Katsura_5.xml")
assert katsura.tag == "INTPS"
assert katsura.attrib == {"createdAt": "1999-03-26", "createdBy": "graebe"}
assert katsura.findtext("vars") == "u0,u1,u2,u3,u4,u5"
katsura_polys = [poly.text for poly in katsura.findall("./basis/poly")]
assert len(katsura_polys) == 6
assert katsura_polys[0] == "u0+2*u1+2*u2+2*u3+2*u4+2*u5-1"
assert katsura_polys[-1] == "u0^2+2*u1^2+2*u2^2+2*u3^2+2*u4^2+2*u5^2-u0"

cyclic = parse_xml("INTPS/Cyclic_4.xml")
assert cyclic.findtext("vars") == "w,x,y,z"
assert [poly.text for poly in cyclic.findall("./basis/poly")] == [
    "w+x+y+z",
    "w*x+x*y+w*z+y*z",
    "w*x*y+w*x*z+w*y*z+x*y*z",
    "w*x*y*z-1",
]

curve = parse_xml("GenPS/Curves.curve3_20.xml")
assert curve.tag == "INTPS"
assert curve.findtext("vars") == "x0,x1,x2,x3"
assert len(curve.findall("./basis/poly")) == 27

geocode = parse_xml("GeoCode.xml")
assert geocode.tag == "GeoCode"
assert geocode.attrib == {"createdAt": "2002-05-28", "createdBy": "graebe"}
assert len(geocode.findall("./GeoFunctionDescription")) > 20

print(
    "symbolic-data-ok xml=%s intps=%s genps=%s"
    % (
        len(xml_files),
        len(list((xml_resources / "INTPS").glob("*.xml"))),
        len(list((xml_resources / "GenPS").glob("*.xml"))),
    )
)
