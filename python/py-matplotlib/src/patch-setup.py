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

path = Path("lib/matplotlib/path.py")
text = path.read_text()
old = """        # Deepcopying arrays (vertices, codes) strips the writeable=False flag.
        p = copy.deepcopy(super(), memo)
        p._readonly = False
        return p
"""
new = """        # Deepcopying arrays (vertices, codes) strips the writeable=False flag.
        p = type(self)._fast_from_codes_and_verts(
            copy.deepcopy(self._vertices, memo),
            copy.deepcopy(self._codes, memo),
            self)
        p._readonly = False
        return p
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected path.py __deepcopy__ block not found")
path.write_text(text)

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

backend_agg = Path("lib/matplotlib/backends/backend_agg.py")
text = backend_agg.read_text()
old = """from contextlib import nullcontext
from math import radians, cos, sin
import threading
"""
new = """from contextlib import nullcontext
from math import radians, cos, sin
import struct
import threading
import zlib
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected backend_agg.py import block not found")

old = """    def _print_pil(self, filename_or_obj, fmt, pil_kwargs, metadata=None):
        \"\"\"
        Draw the canvas, then save it using `.image.imsave` (to which
        *pil_kwargs* and *metadata* are forwarded).
        \"\"\"
        FigureCanvasAgg.draw(self)
        mpl.image.imsave(
            filename_or_obj, self.buffer_rgba(), format=fmt, origin=\"upper\",
            dpi=self.figure.dpi, metadata=metadata, pil_kwargs=pil_kwargs)
"""
new = """    def _print_pil(self, filename_or_obj, fmt, pil_kwargs, metadata=None):
        \"\"\"
        Draw the canvas, then save it using `.image.imsave` (to which
        *pil_kwargs* and *metadata* are forwarded).
        \"\"\"
        FigureCanvasAgg.draw(self)
        mpl.image.imsave(
            filename_or_obj, self.buffer_rgba(), format=fmt, origin=\"upper\",
            dpi=self.figure.dpi, metadata=metadata, pil_kwargs=pil_kwargs)

    def _print_png_without_pil(self, filename_or_obj):
        rgba = self.buffer_rgba()
        height, width = rgba.shape[:2]
        data = bytes(rgba)
        stride = width * 4
        raw = b\"\".join(
            b\"\\x00\" + data[y * stride:(y + 1) * stride]
            for y in range(height))

        def chunk(kind, payload):
            return (
                struct.pack(\">I\", len(payload)) + kind + payload +
                struct.pack(\">I\", zlib.crc32(kind + payload) & 0xffffffff))

        png = (
            b\"\\x89PNG\\r\\n\\x1a\\n\" +
            chunk(b\"IHDR\", struct.pack(\">IIBBBBB\",
                                       width, height, 8, 6, 0, 0, 0)) +
            chunk(b\"IDAT\", zlib.compress(raw)) +
            chunk(b\"IEND\", b\"\"))
        with cbook.open_file_cm(filename_or_obj, \"wb\") as fh:
            fh.write(png)
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected backend_agg.py _print_pil block not found")

old = """        self._print_pil(filename_or_obj, \"png\", pil_kwargs, metadata)
"""
new = """        try:
            self._print_pil(filename_or_obj, \"png\", pil_kwargs, metadata)
        except ImportError as err:
            if \"Pillow is required\" not in str(err):
                raise
            if pil_kwargs:
                raise
            FigureCanvasAgg.draw(self)
            self._print_png_without_pil(filename_or_obj)
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected backend_agg.py print_png block not found")
backend_agg.write_text(text)

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

backend_agg_h = Path("src/_backend_agg.h")
text = backend_agg_h.read_text()
old = """        stroke_t stroke(marker_path_curve);
        stroke.width(points_to_pixels(gc.linewidth));
        stroke.line_cap(gc.cap);
        stroke.line_join(gc.join);
        stroke.miter_limit(points_to_pixels(gc.linewidth));
        theRasterizer.reset();
        theRasterizer.add_path(stroke);
        agg::render_scanlines(theRasterizer, slineP8, scanlines);
        unsigned strokeSize = scanlines.byte_size();
"""
new = """        stroke_t stroke(marker_path_curve);
        stroke.width(points_to_pixels(gc.linewidth));
        stroke.line_cap(gc.cap);
        stroke.line_join(gc.join);
        stroke.miter_limit(points_to_pixels(gc.linewidth));
        theRasterizer.reset();
        theRasterizer.clip_box(0, 0, MARKER_CACHE_SIZE, MARKER_CACHE_SIZE);
        theRasterizer.add_path(stroke);
        theRasterizer.auto_close(false);
        agg::render_scanlines(theRasterizer, slineP8, scanlines);
        theRasterizer.auto_close(true);
        theRasterizer.reset_clipping();
        unsigned strokeSize = scanlines.byte_size();
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected _backend_agg.h marker stroke block not found")
backend_agg_h.write_text(text)

vcgen_stroke = Path("extern/agg24-svn/src/agg_vcgen_stroke.cpp")
text = vcgen_stroke.read_text()
old = """            case end_poly2:
                m_status = m_prev_status;
                return path_cmd_end_poly | path_flags_close | path_flags_cw;
"""
new = """            case end_poly2:
                m_status = m_prev_status;
                return path_cmd_stop;
"""
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit("expected agg_vcgen_stroke.cpp end_poly2 block not found")
vcgen_stroke.write_text(text)

for rasterizer_path in [
    Path("extern/agg24-svn/include/agg_rasterizer_scanline_aa.h"),
    Path("extern/agg24-svn/include/agg_rasterizer_scanline_aa_nogamma.h"),
    Path("extern/agg24-svn/include/agg_rasterizer_compound_aa.h"),
]:
    text = rasterizer_path.read_text()
    old = "cover << (poly_subpixel_shift + 1)"
    new = "cover * (1 << (poly_subpixel_shift + 1))"
    if old in text:
        text = text.replace(old, new)
    elif new not in text:
        raise SystemExit(f"expected AGG cover shift in {rasterizer_path}")
    rasterizer_path.write_text(text)

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
