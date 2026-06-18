# LiE for CoWasm

This package builds SageMath's LiE 2.2.2 tarball as a non-readline WASI
executable. LiE provides computations with weights, roots, characters, Weyl
groups, tensor-product decompositions, and related representation-theory data
for complex semisimple Lie groups and algebras.

The standalone smoke uses the pinned wasi-sdk toolchain, generates LiE's parser
with host `bison`, compiles the executable without readline/ncurses, and checks
a small `A2` root-system session under the WASI runner.

The WASI port provides inert replacements for optional pager, temporary-file,
and timing paths. The smoke intentionally covers non-interactive algebraic use,
not LiE's readline terminal integration or online help indexes.
