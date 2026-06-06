from pathlib import Path

VERSION = "3.6.2"

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

image = Path("lib/matplotlib/image.py")
text = image.read_text()
old = """import numpy as np
import PIL.PngImagePlugin

import matplotlib as mpl
"""
new = """import numpy as np

import matplotlib as mpl
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py Pillow import block not found")

old = """_log = logging.getLogger(__name__)

# map interpolation strings to module constants
"""
new = """_log = logging.getLogger(__name__)


def _get_pil():
    try:
        import PIL.Image
        import PIL.PngImagePlugin
    except ImportError as exc:
        raise ImportError("Pillow is required for Matplotlib image I/O") from exc
    return PIL


# map interpolation strings to module constants
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py logger block not found")

old = """        im = self.to_rgba(self._A[::-1] if self.origin == 'lower' else self._A,
                          bytes=True, norm=True)
        PIL.Image.fromarray(im).save(fname, format=\"png\")
"""
new = """        im = self.to_rgba(self._A[::-1] if self.origin == 'lower' else self._A,
                          bytes=True, norm=True)
        PIL = _get_pil()
        PIL.Image.fromarray(im).save(fname, format=\"png\")
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py write_png block not found")

old = """        if isinstance(A, PIL.Image.Image):
            A = pil_to_array(A)  # Needed e.g. to apply png palette.
        self._A = cbook.safe_masked_invalid(A, copy=True)
"""
new = """        try:
            PIL = _get_pil()
        except ImportError:
            PIL = None
        if PIL is not None and isinstance(A, PIL.Image.Image):
            A = pil_to_array(A)  # Needed e.g. to apply png palette.
        self._A = cbook.safe_masked_invalid(A, copy=True)
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py set_data block not found")

old = """    img_open = (
        PIL.PngImagePlugin.PngImageFile if ext == 'png' else PIL.Image.open)
"""
new = """    PIL = _get_pil()
    img_open = (
        PIL.PngImagePlugin.PngImageFile if ext == 'png' else PIL.Image.open)
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py imread block not found")

old = """        if pil_kwargs is None:
            pil_kwargs = {}
        pil_shape = (rgba.shape[1], rgba.shape[0])
        image = PIL.Image.frombuffer(
"""
new = """        if pil_kwargs is None:
            pil_kwargs = {}
        PIL = _get_pil()
        pil_shape = (rgba.shape[1], rgba.shape[0])
        image = PIL.Image.frombuffer(
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected image.py imsave block not found")
image.write_text(text)

font_manager = Path("lib/matplotlib/font_manager.py")
text = font_manager.read_text()
old = """        # Delay the warning by 5s.
        timer = threading.Timer(5, lambda: _log.warning(
            'Matplotlib is building the font cache; this may take a moment.'))
        timer.start()
        try:
            for fontext in [\"afm\", \"ttf\"]:
                for path in [*findSystemFonts(paths, fontext=fontext),
                             *findSystemFonts(fontext=fontext)]:
                    try:
                        self.addfont(path)
                    except OSError as exc:
                        _log.info(\"Failed to open font file %s: %s\", path, exc)
                    except Exception as exc:
                        _log.info(\"Failed to extract font properties from %s: \"
                                  \"%s\", path, exc)
        finally:
            timer.cancel()
"""
old_threadless = """        for fontext in [\"afm\", \"ttf\"]:
            for path in [*findSystemFonts(paths, fontext=fontext),
                         *findSystemFonts(fontext=fontext)]:
                try:
                    self.addfont(path)
                except OSError as exc:
                    _log.info(\"Failed to open font file %s: %s\", path, exc)
                except Exception as exc:
                    _log.info(\"Failed to extract font properties from %s: \"
                              \"%s\", path, exc)
"""
new = """        for fontext in [\"afm\", \"ttf\"]:
            for path in findSystemFonts(paths, fontext=fontext):
                try:
                    self.addfont(path)
                except OSError as exc:
                    _log.info(\"Failed to open font file %s: %s\", path, exc)
                except Exception as exc:
                    _log.info(\"Failed to extract font properties from %s: \"
                              \"%s\", path, exc)
"""
if old in text:
    font_manager.write_text(text.replace(old, new))
elif old_threadless in text:
    font_manager.write_text(text.replace(old_threadless, new))
elif new not in text:
    raise SystemExit("expected font_manager.py font cache timer block not found")

ft2font = Path("src/ft2font.cpp")
text = ft2font.read_text()
old = """#include <sstream>
#include <stdexcept>
"""
new = """#include <cstdio>
#include <sstream>
#include <stdexcept>
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected ft2font.cpp include block not found")
old = """    throw std::runtime_error(os.str());
"""
new = """    std::fprintf(stderr, \"CoWasm ft2font FreeType error: %s\\\\n\", os.str().c_str());
    throw std::runtime_error(os.str());
"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit("expected ft2font.cpp throw_ft_error block not found")
ft2font.write_text(text)

ft2font_wrapper = Path("src/ft2font_wrapper.cpp")
text = ft2font_wrapper.read_text()
old = """    if (!(seek_result = PyObject_CallMethod(py_file, \"seek\", \"k\", offset))
        || !(read_result = PyObject_CallMethod(py_file, \"read\", \"k\", count))) {
        goto exit;
    }
    char *tmpbuf;
    if (PyBytes_AsStringAndSize(read_result, &tmpbuf, &n_read) == -1) {
        goto exit;
    }
    memcpy(buffer, tmpbuf, n_read);
exit:
"""
new = """    if (!(seek_result = PyObject_CallMethod(py_file, \"seek\", \"k\", offset))) {
        goto exit;
    }
    if (count == 0) {
        goto exit;
    }
    if (buffer == NULL) {
        PyErr_SetString(PyExc_RuntimeError, \"FreeType requested a read into a null buffer\");
        goto exit;
    }
    if (!(read_result = PyObject_CallMethod(py_file, \"read\", \"k\", count))) {
        goto exit;
    }
    char *tmpbuf;
    if (PyBytes_AsStringAndSize(read_result, &tmpbuf, &n_read) == -1) {
        goto exit;
    }
    memcpy(buffer, tmpbuf, n_read);
exit:
"""
if old in text:
    ft2font_wrapper.write_text(text.replace(old, new))
elif new not in text:
    raise SystemExit("expected ft2font_wrapper.py read callback block not found")

Path("lib/matplotlib/_version.py").write_text(f"version = '{VERSION}'\n")

Path("mplsetup.cfg").write_text(
    """[libs]
enable_lto = False
system_freetype = True
system_qhull = True

[rc_options]
backend = Agg
"""
)
