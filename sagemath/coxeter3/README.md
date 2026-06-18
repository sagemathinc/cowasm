# Coxeter3

This package builds the Coxeter3 library and interactive command-line program
for Coxeter groups and Kazhdan-Lusztig computations in SageMath.

The standalone smoke compiles the static library and `coxeter` executable,
installs headers and Coxeter data files, checks that the interactive banner can
load from the installed data directory, and links a C++ probe for basic B2
group operations under the WASI runner.
