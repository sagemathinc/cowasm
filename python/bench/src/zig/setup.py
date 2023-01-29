# Run as:
#    python-wasm setup.py build

from setuptools import Extension, setup
from Cython.Build import cythonize

extensions = [
    Extension("nt", ["nt.pyx"], libraries=["nt.wasm.o"], library_dirs=["."]),
]

setup(
    name="Bench",
    ext_modules=cythonize(extensions),
)
