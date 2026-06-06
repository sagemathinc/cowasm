from pathlib import Path


setup = Path("setup.py")
text = setup.read_text()
old = '''    setup_requires=[
        "certifi>=2020.06.20",
        "numpy>=1.19",
        "setuptools_scm>=7",
    ],
'''
new = '''    setup_requires=[],
'''
if old not in text:
    if new not in text:
        raise SystemExit("expected setup_requires block not found")
else:
    setup.write_text(text.replace(old, new))

colors = Path("lib/matplotlib/colors.py")
text = colors.read_text()
old = """from PIL import Image
from PIL.PngImagePlugin import PngInfo
"""
if old in text:
    text = text.replace(old, "")

old = """        pnginfo = PngInfo()
        pnginfo.add_text('Title', title)
"""
new = """        from PIL import Image
        from PIL.PngImagePlugin import PngInfo
        pnginfo = PngInfo()
        pnginfo.add_text('Title', title)
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected colors.py _repr_png_ block not found")
colors.write_text(text)

Path("mplsetup.cfg").write_text(
    """[libs]
enable_lto = False
system_freetype = True
system_qhull = True

[rc_options]
backend = Agg
"""
)
