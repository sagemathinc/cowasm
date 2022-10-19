# Run as:
#    python-wasm setup.py build

from distutils.core import setup
from distutils.extension import Extension
from Cython.Build import cythonize

ext_modules = cythonize("*.pyx")

setup(
    name='Bench',
    ext_modules=ext_modules,
)
